from datetime import datetime

import psutil
from fastapi import APIRouter, HTTPException, logger

router = APIRouter()


@router.get("/system-info")
async def get_system_info():
    try:
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        timestamp = str(datetime.now())
        print("Fetched system info")
        return {
            "timestamp": timestamp,
            "cpu_usage_percent": cpu_usage,
            "cpu_usage_label": f"{cpu_usage}%",
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "memory_used_gb": round(memory.used / (1024**3), 2),
            "memory_remaining_gb": round((memory.total - memory.used) / (1024**3), 2),
            "memory_percent": memory.percent,
            "disk_total_gb": round(disk.total / (1024**3), 2),
            "disk_used_gb": round(disk.used / (1024**3), 2),
            "disk_remaining_gb": round((disk.total - disk.used) / (1024**3), 2),
            "disk_percent": disk.percent,
        }
    except Exception as e:
        logger.error(f"Error in /system-info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
