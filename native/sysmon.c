/* Windows 10/11 collector. No managed runtime, WMI or external DLL distribution. */
#define _WIN32_WINNT 0x0A00
#define WIN32_LEAN_AND_MEAN
#define COBJMACROS
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>
#include <iphlpapi.h>
#include <netioapi.h>
#include <winioctl.h>
#include <dxgi.h>
#include <cfgmgr32.h>
#include <pdh.h>
#include <pdhmsg.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <wchar.h>
#include <inttypes.h>

/* Notifications only invalidate telemetry baselines; enumeration stays on the sampler thread. */
static volatile LONG device_epoch = 0;
static HCMNOTIFICATION device_notification = NULL;
static DWORD CALLBACK device_changed(HCMNOTIFICATION notification, PVOID context,
    CM_NOTIFY_ACTION action, PCM_NOTIFY_EVENT_DATA data, DWORD size) {
  (void)notification; (void)context; (void)data; (void)size;
  if (action == CM_NOTIFY_ACTION_DEVICEINTERFACEARRIVAL || action == CM_NOTIFY_ACTION_DEVICEINTERFACEREMOVAL)
    InterlockedIncrement(&device_epoch);
  return ERROR_SUCCESS;
}
static void close_device_notification(void) {
  if (device_notification) CM_Unregister_Notification(device_notification);
}
static void watch_devices(void) {
  CM_NOTIFY_FILTER filter = {0}; filter.cbSize = sizeof(filter);
  filter.Flags = CM_NOTIFY_FILTER_FLAG_ALL_INTERFACE_CLASSES;
  filter.FilterType = CM_NOTIFY_FILTER_TYPE_DEVICEINTERFACE;
  if (CM_Register_Notification(&filter, NULL, device_changed, &device_notification) == CR_SUCCESS)
    atexit(close_device_notification);
}

static uint64_t ticks(FILETIME ft) {
  return ((uint64_t)ft.dwHighDateTime << 32) | ft.dwLowDateTime;
}

/* Bounded conversion also escapes control characters and JSON punctuation. */
static void json_string(const wchar_t *value) {
  char utf8[4096];
  int size = WideCharToMultiByte(CP_UTF8, 0, value, -1, utf8, sizeof(utf8), NULL, NULL);
  putchar('"');
  if (size) for (int i = 0; i < size - 1; i++) {
    unsigned char c = (unsigned char)utf8[i];
    if (c == '"' || c == '\\') { putchar('\\'); putchar(c); }
    else if (c < 32) printf("\\u%04x", c);
    else putchar(c);
  }
  putchar('"');
}

static int process_list(void) {
  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snapshot == INVALID_HANDLE_VALUE) return 0;
  PROCESSENTRY32W entry = {0}; entry.dwSize = sizeof(entry);
  int comma = 0;
  if (Process32FirstW(snapshot, &entry)) do {
    HANDLE p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, entry.th32ProcessID);
    FILETIME created, exited, kernel, user;
    PROCESS_MEMORY_COUNTERS_EX memory = {0}; memory.cb = sizeof(memory);
    BOOL have_time = p && GetProcessTimes(p, &created, &exited, &kernel, &user);
    BOOL have_memory = p && GetProcessMemoryInfo(p, (PROCESS_MEMORY_COUNTERS *)&memory, sizeof(memory));
    if (comma++) putchar(',');
    printf("{\"pid\":%lu,\"cmd\":", (unsigned long)entry.th32ProcessID);
    json_string(entry.szExeFile);
    printf(",\"thr\":%lu,\"rss\":", (unsigned long)entry.cntThreads);
    if (have_memory) printf("%" PRIu64, (uint64_t)memory.WorkingSetSize); else fputs("null", stdout);
    fputs(",\"time\":", stdout);
    if (have_time) printf("%.7f", (ticks(kernel) + ticks(user)) / 10000000.0); else fputs("null", stdout);
    fputs(",\"start\":", stdout);
    /* Preserve the existing decimal .NET ticks identity, including its epoch. */
    if (have_time) printf("\"%" PRIu64 "\"", ticks(created) + UINT64_C(504911232000000000)); else fputs("null", stdout);
    putchar('}');
    if (p) CloseHandle(p);
  } while (Process32NextW(snapshot, &entry));
  CloseHandle(snapshot);
  return 1;
}

static int network_list(void) {
  MIB_IF_TABLE2 *table = NULL;
  if (GetIfTable2(&table) != NO_ERROR) return 0;
  int comma = 0;
  for (ULONG i = 0; i < table->NumEntries; i++) {
    MIB_IF_ROW2 *row = &table->Table[i];
    if (row->Type == IF_TYPE_SOFTWARE_LOOPBACK || row->InterfaceAndOperStatusFlags.FilterInterface || row->InterfaceAndOperStatusFlags.EndPointInterface || row->OperStatus != IfOperStatusUp) continue;
    if (comma++) putchar(',');
    fputs("{\"name\":", stdout); json_string(row->Alias[0] ? row->Alias : row->Description);
    printf(",\"id\":\"%" PRIu64 "\",\"rx\":%" PRIu64 ",\"tx\":%" PRIu64 "}",
      (uint64_t)row->InterfaceLuid.Value, (uint64_t)row->InOctets, (uint64_t)row->OutOctets);
  }
  FreeMibTable(table);
  return 1;
}

/* Read physical-device counters without loading PDH's provider/runtime graph. */
static int disk_list(void) {
  static wchar_t *names = NULL;
  static DWORD capacity = 0;
  for (;;) {
    if (capacity && QueryDosDeviceW(NULL, names, capacity)) break;
    if (capacity && GetLastError() != ERROR_INSUFFICIENT_BUFFER) return 0;
    if (capacity >= 1048576) return 0;
    DWORD next_capacity = capacity ? capacity * 2 : 16384;
    wchar_t *next = realloc(names, next_capacity * sizeof(wchar_t));
    if (!next) return 0;
    names = next; capacity = next_capacity;
  }
  int comma = 0;
  LONG epoch = InterlockedCompareExchange(&device_epoch, 0, 0);
  for (const wchar_t *name = names; *name; name += wcslen(name) + 1) {
    if (_wcsnicmp(name, L"PhysicalDrive", 13)) continue;
    wchar_t path[128];
    swprintf(path, sizeof(path) / sizeof(path[0]), L"\\\\.\\%ls", name);
    HANDLE disk = CreateFileW(path, 0, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_EXISTING, 0, NULL);
    if (disk == INVALID_HANDLE_VALUE) continue;
    DISK_PERFORMANCE performance; DWORD bytes = 0;
    BOOL ok = DeviceIoControl(disk, IOCTL_DISK_PERFORMANCE, NULL, 0, &performance, sizeof(performance), &bytes, NULL);
    STORAGE_DEVICE_NUMBER_EX identity = {0}; DWORD identity_bytes = 0;
    BOOL have_id = DeviceIoControl(disk, IOCTL_STORAGE_GET_DEVICE_NUMBER_EX, NULL, 0,
      &identity, sizeof(identity), &identity_bytes, NULL) && identity_bytes >= sizeof(identity);
    CloseHandle(disk);
    if (comma++) putchar(',');
    fputs("{\"name\":", stdout); json_string(name);
    fputs(",\"id\":\"", stdout);
    /* GUID plus notification epoch also handles rapid replacement at the same PhysicalDrive number. */
    if (have_id) {
      const unsigned char *guid = (const void *)&identity.DeviceGuid;
      for (size_t i = 0; i < sizeof(GUID); i++) printf("%02x", guid[i]);
    }
    printf(":%ls:%lu\",\"readBytes\":", name, (unsigned long)(DWORD)epoch);
    if (ok && bytes >= sizeof(performance)) printf("%" PRIu64, (uint64_t)performance.BytesRead.QuadPart); else fputs("null", stdout);
    fputs(",\"writeBytes\":", stdout);
    if (ok && bytes >= sizeof(performance)) printf("%" PRIu64, (uint64_t)performance.BytesWritten.QuadPart); else fputs("null", stdout);
    putchar('}');
  }
  return 1;
}

static PDH_HQUERY gpu_query = NULL;
static PDH_HCOUNTER gpu_counter = NULL;
static void *gpu_items = NULL;
static DWORD gpu_capacity = 0;
static void close_gpu_query(void) {
  if (gpu_query) PdhCloseQuery(gpu_query);
  free(gpu_items);
}

/* One shared wildcard query; formatted per-process engine rates are aggregated by Host. */
static void gpu_engine_sample(void) {
  static int initialized = 0, samples = 0;
  static LONG epoch = -1;
  LONG current_epoch = InterlockedCompareExchange(&device_epoch, 0, 0);
  if (epoch != current_epoch || (initialized && !gpu_counter)) {
    if (gpu_query) PdhCloseQuery(gpu_query);
    gpu_query = NULL; gpu_counter = NULL; samples = 0;
    epoch = current_epoch;
  }
  if (!initialized) { initialized = 1; atexit(close_gpu_query); }
  if (!gpu_query) {
    if (PdhOpenQueryW(NULL, 0, &gpu_query) == ERROR_SUCCESS &&
        PdhAddEnglishCounterW(gpu_query, L"\\GPU Engine(*)\\Utilization Percentage", 0, &gpu_counter) != ERROR_SUCCESS) gpu_counter = NULL;
  }
  const char *status = "unavailable";
  DWORD count = 0, bytes = gpu_capacity;
  if (gpu_counter && PdhCollectQueryData(gpu_query) == ERROR_SUCCESS) {
    samples++;
    status = samples < 2 ? "collecting" : "unavailable";
    if (samples >= 2) {
      PDH_STATUS result = PdhGetFormattedCounterArrayW(gpu_counter, PDH_FMT_DOUBLE | PDH_FMT_NOCAP100, &bytes, &count, gpu_items);
      if (result == (PDH_STATUS)PDH_MORE_DATA && bytes <= 16 * 1024 * 1024) {
        void *next = realloc(gpu_items, bytes);
        if (next) {
          gpu_items = next; gpu_capacity = bytes;
          result = PdhGetFormattedCounterArrayW(gpu_counter, PDH_FMT_DOUBLE | PDH_FMT_NOCAP100, &bytes, &count, gpu_items);
        }
      }
      if (result == ERROR_SUCCESS) status = "available";
    }
  }
  printf(",\"utilizationStatus\":\"%s\",\"engines\":[", status);
  if (!strcmp(status, "available")) {
    PDH_FMT_COUNTERVALUE_ITEM_W *items = gpu_items;
    int comma = 0;
    for (DWORD i = 0; i < count; i++) {
      PDH_FMT_COUNTERVALUE *value = &items[i].FmtValue;
      if ((value->CStatus != PDH_CSTATUS_VALID_DATA && value->CStatus != PDH_CSTATUS_NEW_DATA) || !isfinite(value->doubleValue) || value->doubleValue < 0) continue;
      const wchar_t *luid = wcsstr(items[i].szName, L"luid_");
      const wchar_t *type = wcsstr(items[i].szName, L"_engtype_");
      unsigned int high, low, physical, engine;
      if (!luid || swscanf(luid, L"luid_0x%x_0x%x_phys_%u_eng_%u", &high, &low, &physical, &engine) != 4) continue;
      if (comma++) putchar(',');
      printf("{\"adapter\":\"%08x_%08x\",\"id\":\"%u_%u\",\"usage\":%.6f,\"name\":", high, low, physical, engine, value->doubleValue);
      json_string(type ? type + 9 : L"GPU"); putchar('}');
    }
  }
  putchar(']');
  if (gpu_counter && !strcmp(status, "unavailable")) {
    PdhCloseQuery(gpu_query); gpu_query = NULL; gpu_counter = NULL; samples = 0;
  }
}

/* Refresh descriptions every sample so hot-added and removed hardware is reflected. */
static void hardware_info(void) {
  DXGI_ADAPTER_DESC1 *gpus = NULL;
  size_t gpu_count = 0;
  DWORD physical = 0, packages = 0;
  int gpu_ok = 0;
  {
    DWORD bytes = 0;
    GetLogicalProcessorInformationEx(RelationAll, NULL, &bytes);
    SYSTEM_LOGICAL_PROCESSOR_INFORMATION_EX *info = bytes ? malloc(bytes) : NULL;
    if (info && GetLogicalProcessorInformationEx(RelationAll, info, &bytes)) {
      for (DWORD offset = 0; offset < bytes;) {
        SYSTEM_LOGICAL_PROCESSOR_INFORMATION_EX *item = (void *)((char *)info + offset);
        if (!item->Size || item->Size > bytes - offset) break;
        if (item->Relationship == RelationProcessorCore) physical++;
        if (item->Relationship == RelationProcessorPackage) packages++;
        offset += item->Size;
      }
    }
    free(info);
    const GUID factory_iid = {0x770aae78,0xf26f,0x4dba,{0xa8,0x29,0x25,0x3c,0x83,0xd1,0xb3,0x87}};
    IDXGIFactory1 *factory = NULL;
    if (SUCCEEDED(CreateDXGIFactory1(&factory_iid, (void **)&factory))) {
      gpu_ok = 1;
      for (UINT i = 0;; i++) {
        IDXGIAdapter1 *adapter = NULL;
        HRESULT result = IDXGIFactory1_EnumAdapters1(factory, i, &adapter);
        if (result == DXGI_ERROR_NOT_FOUND) break;
        if (FAILED(result)) { gpu_ok = 0; break; }
        DXGI_ADAPTER_DESC1 desc;
        if (SUCCEEDED(IDXGIAdapter1_GetDesc1(adapter, &desc)) && !(desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE)) {
          DXGI_ADAPTER_DESC1 *next = realloc(gpus, (gpu_count + 1) * sizeof(*gpus));
          if (next) { gpus = next; gpus[gpu_count++] = desc; }
          else gpu_ok = 0;
        }
        IDXGIAdapter1_Release(adapter);
      }
      IDXGIFactory1_Release(factory);
    }
  }
  printf("\"topology\":{\"physicalCores\":");
  if (physical) printf("%lu", (unsigned long)physical); else fputs("null", stdout);
  printf(",\"packages\":");
  if (packages) printf("%lu", (unsigned long)packages); else fputs("null", stdout);
  printf(",\"logicalProcessors\":%lu},\"gpu\":{\"status\":\"%s\",\"devices\":[",
    (unsigned long)GetActiveProcessorCount(ALL_PROCESSOR_GROUPS), gpu_ok ? "available" : "unavailable");
  for (size_t i = 0; i < gpu_count; i++) {
    if (i) putchar(',');
    printf("{\"id\":\"%08lx_%08lx\",\"name\":", (unsigned long)(DWORD)gpus[i].AdapterLuid.HighPart, (unsigned long)gpus[i].AdapterLuid.LowPart); json_string(gpus[i].Description);
    printf(",\"dedicatedBytes\":%" PRIu64 ",\"sharedBytes\":%" PRIu64 "}",
      (uint64_t)gpus[i].DedicatedVideoMemory, (uint64_t)gpus[i].SharedSystemMemory);
  }
  free(gpus);
  putchar(']'); gpu_engine_sample(); putchar('}');
}

static int error(const char *message) { fputs(message, stdout); return 1; }
static int decimal(const char *s, uint64_t *value) {
  if (!s || !*s) return 0;
  uint64_t n = 0;
  for (; *s; s++) {
    if (*s < '0' || *s > '9' || n > (UINT64_MAX - (*s - '0')) / 10) return 0;
    n = n * 10 + (*s - '0');
  }
  *value = n; return 1;
}

static int terminate_process(const char *pid_text, const char *start_text) {
  uint64_t id, identity;
  if (!decimal(pid_text, &id) || id <= 4 || id > MAXDWORD || !decimal(start_text, &identity)) return error("Invalid process identity");
  HANDLE p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_TERMINATE, FALSE, (DWORD)id);
  if (!p) return error("Unable to open process (permission denied or process exited)");
  int result = 1; BOOL critical = TRUE;
  FILETIME created, exited, kernel, user;
  wchar_t image[32768]; DWORD length = sizeof(image) / sizeof(image[0]);
  if (!IsProcessCritical(p, &critical) || critical || !QueryFullProcessImageNameW(p, 0, image, &length)) {
    error("Protected Windows process"); goto done;
  }
  const wchar_t *name = wcsrchr(image, L'\\'); name = name ? name + 1 : image;
  const wchar_t *protected_names[] = {L"System",L"Registry",L"smss.exe",L"csrss.exe",L"wininit.exe",L"winlogon.exe",L"services.exe",L"lsass.exe",L"LsaIso.exe",L"Secure System"};
  for (size_t i = 0; i < sizeof(protected_names) / sizeof(protected_names[0]); i++)
    if (!_wcsicmp(name, protected_names[i])) { error("Protected Windows process"); goto done; }
  if (!GetProcessTimes(p, &created, &exited, &kernel, &user) || ticks(created) + UINT64_C(504911232000000000) != identity) {
    error("Process changed; refresh and select again"); goto done;
  }
  /* Identity check and termination use the same open kernel handle. */
  if (!TerminateProcess(p, 1)) { error("Unable to end process (permission denied or process exited)"); goto done; }
  fputs("ok", stdout); result = 0;
done:
  CloseHandle(p); return result;
}

static int inspect_memory(const char *pid_text) {
  uint64_t id;
  if (!decimal(pid_text, &id) || id > MAXDWORD) return error("Invalid PID");
  HANDLE p = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, (DWORD)id);
  PROCESS_MEMORY_COUNTERS_EX memory = {0}; memory.cb = sizeof(memory); DWORD handles = 0;
  if (!p) return error("Cannot open process");
  BOOL ok = GetProcessMemoryInfo(p, (PROCESS_MEMORY_COUNTERS *)&memory, sizeof(memory));
  GetProcessHandleCount(p, &handles); CloseHandle(p);
  if (!ok) return error("Cannot read process memory");
  printf("{\"workingSet\":%" PRIu64 ",\"privateBytes\":%" PRIu64 ",\"handles\":%lu}\n",
    (uint64_t)memory.WorkingSetSize, (uint64_t)memory.PrivateUsage, (unsigned long)handles);
  return 0;
}

int main(int argc, char **argv) {
  if (argc == 4 && !strcmp(argv[1], "--kill")) return terminate_process(argv[2], argv[3]);
  if (argc == 3 && !strcmp(argv[1], "--memory")) return inspect_memory(argv[2]);
  if (argc == 3 && !strcmp(argv[1], "--watch-memory")) {
    uint64_t id;
    if (!decimal(argv[2], &id) || id > MAXDWORD) return error("Invalid PID");
    HANDLE target = OpenProcess(SYNCHRONIZE, FALSE, (DWORD)id);
    if (!target) return error("Cannot watch process");
    while (WaitForSingleObject(target, 0) == WAIT_TIMEOUT) {
      if (inspect_memory(argv[2]) || fflush(stdout)) break;
      if (WaitForSingleObject(target, 2000) != WAIT_TIMEOUT) break;
    }
    CloseHandle(target); return 0;
  }
  uint64_t parent_id;
  if (argc != 3 || strcmp(argv[1], "--parent") || !decimal(argv[2], &parent_id) || parent_id > MAXDWORD)
    return error("Usage: sysmon-probe --parent PID | --kill PID START | --memory PID");
  HANDLE parent = OpenProcess(SYNCHRONIZE, FALSE, (DWORD)parent_id);
  if (!parent) return error("Cannot watch parent process");
  watch_devices();
  static char output_buffer[65536]; setvbuf(stdout, output_buffer, _IOFBF, sizeof(output_buffer));
  while (WaitForSingleObject(parent, 0) == WAIT_TIMEOUT) {
    ULONGLONG began = GetTickCount64(); FILETIME now; GetSystemTimeAsFileTime(&now);
    printf("{\"v\":1,\"monoMs\":%" PRIu64 ",\"ts\":%" PRIu64 ",\"procs\":[", (uint64_t)began, (ticks(now) - UINT64_C(116444736000000000)) / 10000);
    int procs_ok = process_list();
    fputs("],\"net\":[", stdout); int net_ok = network_list();
    fputs("],\"disks\":[", stdout);
    int disk_ok = disk_list();
    fputs("],", stdout); hardware_info();
    fputs(",\"errors\":[", stdout);
    int comma = 0;
    if (!procs_ok) { fputs("\"process list unavailable\"", stdout); comma = 1; }
    if (!net_ok) { if (comma++) putchar(','); fputs("\"network unavailable\"", stdout); }
    if (!disk_ok) { if (comma) putchar(','); fputs("\"disk counters unavailable\"", stdout); }
    fputs("]}\n", stdout);
    if (fflush(stdout) || ferror(stdout)) break;
    ULONGLONG elapsed = GetTickCount64() - began;
    if (WaitForSingleObject(parent, elapsed >= 2000 ? 200 : (DWORD)(2000 - elapsed)) != WAIT_TIMEOUT) break;
  }
  CloseHandle(parent);
  return 0;
}
