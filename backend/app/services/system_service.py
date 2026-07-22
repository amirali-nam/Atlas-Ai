"""Live system telemetry via psutil."""
import platform
import time

import psutil

_BOOT = psutil.boot_time()


def get_stats() -> dict:
    vm = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    return {
        "cpu": {
            "percent": psutil.cpu_percent(interval=0.1),
            "cores": psutil.cpu_count(logical=True),
            "per_core": psutil.cpu_percent(percpu=True),
        },
        "memory": {
            "percent": vm.percent,
            "used_gb": round(vm.used / 1e9, 2),
            "total_gb": round(vm.total / 1e9, 2),
        },
        "disk": {
            "percent": disk.percent,
            "used_gb": round(disk.used / 1e9, 1),
            "total_gb": round(disk.total / 1e9, 1),
        },
        "network": {"sent_mb": round(net.bytes_sent / 1e6, 1), "recv_mb": round(net.bytes_recv / 1e6, 1)},
        "uptime_seconds": int(time.time() - _BOOT),
        "platform": f"{platform.system()} {platform.release()}",
        "hostname": platform.node(),
    }
