package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type Metrics struct {
	Timestamp int64       `json:"timestamp"`
	System    SystemInfo  `json:"system"`
	CPU       CPUInfo     `json:"cpu"`
	Memory    MemoryInfo  `json:"memory"`
	Disk      DiskInfo    `json:"disk"`
	Network   interface{} `json:"network"`
	GPU       GPUInfo     `json:"gpu"`
}

type SystemInfo struct {
	Platform      string `json:"platform"`
	Hostname      string `json:"hostname"`
	UptimeSeconds int64  `json:"uptime_seconds"`
	BootTime      int64  `json:"boot_time"`
}

type CPUInfo struct {
	Percent      float64    `json:"percent"`
	Count        int        `json:"count"`
	FrequencyMHz float64    `json:"frequency_mhz"`
	LoadAverage  LoadAvg    `json:"load_average"`
}

type LoadAvg struct {
	Min1  float64 `json:"1min"`
	Min5  float64 `json:"5min"`
	Min15 float64 `json:"15min"`
}

type MemoryInfo struct {
	TotalGB     float64 `json:"total_gb"`
	UsedGB      float64 `json:"used_gb"`
	AvailableGB float64 `json:"available_gb"`
	Percent     float64 `json:"percent"`
	SwapTotalGB float64 `json:"swap_total_gb"`
	SwapUsedGB  float64 `json:"swap_used_gb"`
	SwapPercent float64 `json:"swap_percent"`
}

type DiskInfo struct {
	TotalGB float64  `json:"total_gb"`
	UsedGB  float64  `json:"used_gb"`
	FreeGB  float64  `json:"free_gb"`
	Percent float64  `json:"percent"`
	DiskIO  DiskIO   `json:"disk_io"`
}

type DiskIO struct {
	ReadMB  *float64 `json:"read_mb"`
	WriteMB *float64 `json:"write_mb"`
}

type GPUInfo struct {
	Available bool        `json:"available"`
	Error     string      `json:"error,omitempty"`
	GPUs      []GPUDevice `json:"gpus,omitempty"`
}

type GPUDevice struct {
	ID           int     `json:"id"`
	Name         string  `json:"name"`
	Load         float64 `json:"load"`
	MemoryUsed   uint64  `json:"memory_used"`
	MemoryTotal  uint64  `json:"memory_total"`
	MemoryPercent float64 `json:"memory_percent"`
	Temperature  float64 `json:"temperature"`
}

type NetworkStats struct {
	SentMbps   float64 `json:"sent_mbps"`
	RecvMbps   float64 `json:"recv_mbps"`
	BytesSent  uint64  `json:"bytes_sent"`
	BytesRecv  uint64  `json:"bytes_recv"`
	PacketsSent uint64  `json:"packets_sent"`
	PacketsRecv uint64  `json:"packets_recv"`
	Errors     uint64  `json:"errors"`
	Dropped    uint64  `json:"dropped"`
}

func getGPUUsage() GPUInfo {
	return GPUInfo{
		Available: false,
		Error:     "GPU monitoring not implemented in Go version",
	}
}

func getNetworkStats() (map[string]NetworkStats, error) {
	netStart, err := net.IOCounters(true)
	if err != nil {
		return nil, err
	}

	time.Sleep(1 * time.Second)

	netEnd, err := net.IOCounters(true)
	if err != nil {
		return nil, err
	}

	stats := make(map[string]NetworkStats)
	
	for _, end := range netEnd {
		for _, start := range netStart {
			if start.Name == end.Name {
				bytesSentRate := end.BytesSent - start.BytesSent
				bytesRecvRate := end.BytesRecv - start.BytesRecv

				sentMbps := float64(bytesSentRate*8) / (1024 * 1024)
				recvMbps := float64(bytesRecvRate*8) / (1024 * 1024)

				stats[end.Name] = NetworkStats{
					SentMbps:    roundFloat(sentMbps, 2),
					RecvMbps:    roundFloat(recvMbps, 2),
					BytesSent:   end.BytesSent,
					BytesRecv:   end.BytesRecv,
					PacketsSent: end.PacketsSent,
					PacketsRecv: end.PacketsRecv,
					Errors:      end.Errout + end.Errin,
					Dropped:     end.Dropout + end.Dropin,
				}
				break
			}
		}
	}

	return stats, nil
}

func roundFloat(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}

func getMetrics() (*Metrics, error) {
	// CPU metrics
	cpuPercent, err := cpu.Percent(1*time.Second, false)
	if err != nil {
		return nil, err
	}

	cpuCount, err := cpu.Counts(true)
	if err != nil {
		return nil, err
	}

	cpuFreq, err := cpu.Info()
	if err != nil {
		return nil, err
	}

	loadAvg, err := load.Avg()
	if err != nil {
		return nil, err
	}

	// Memory metrics
	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	swap, err := mem.SwapMemory()
	if err != nil {
		return nil, err
	}

	// Disk metrics
	diskUsage, err := disk.Usage("/")
	if err != nil {
		return nil, err
	}

	diskIO, err := disk.IOCounters()
	if err != nil {
		return nil, err
	}

	// Network metrics
	networkStats, err := getNetworkStats()
	if err != nil {
		networkStats = make(map[string]NetworkStats)
	}

	// System info
	bootTime, err := host.BootTime()
	if err != nil {
		return nil, err
	}

	uptime := time.Now().Unix() - int64(bootTime)

	hostInfo, err := host.Info()
	if err != nil {
		return nil, err
	}

	// Disk IO
	var readMB, writeMB *float64
	if len(diskIO) > 0 {
		for _, io := range diskIO {
			if io.ReadBytes > 0 {
				val := roundFloat(float64(io.ReadBytes)/(1024*1024), 2)
				readMB = &val
			}
			if io.WriteBytes > 0 {
				val := roundFloat(float64(io.WriteBytes)/(1024*1024), 2)
				writeMB = &val
			}
			break
		}
	}

	var freqMHz float64
	if len(cpuFreq) > 0 {
		freqMHz = float64(cpuFreq[0].Mhz)
	}

	metrics := &Metrics{
		Timestamp: time.Now().Unix(),
		System: SystemInfo{
			Platform:      runtime.GOOS,
			Hostname:      hostInfo.Hostname,
			UptimeSeconds: uptime,
			BootTime:      int64(bootTime),
		},
		CPU: CPUInfo{
			Percent:      roundFloat(cpuPercent[0], 2),
			Count:        cpuCount,
			FrequencyMHz: freqMHz,
			LoadAverage: LoadAvg{
				Min1:  roundFloat(loadAvg.Load1, 2),
				Min5:  roundFloat(loadAvg.Load5, 2),
				Min15: roundFloat(loadAvg.Load15, 2),
			},
		},
		Memory: MemoryInfo{
			TotalGB:     roundFloat(float64(memInfo.Total)/(1024*1024*1024), 2),
			UsedGB:      roundFloat(float64(memInfo.Used)/(1024*1024*1024), 2),
			AvailableGB: roundFloat(float64(memInfo.Available)/(1024*1024*1024), 2),
			Percent:     roundFloat(memInfo.UsedPercent, 2),
			SwapTotalGB: roundFloat(float64(swap.Total)/(1024*1024*1024), 2),
			SwapUsedGB:  roundFloat(float64(swap.Used)/(1024*1024*1024), 2),
			SwapPercent: roundFloat(swap.UsedPercent, 2),
		},
		Disk: DiskInfo{
			TotalGB: roundFloat(float64(diskUsage.Total)/(1024*1024*1024), 2),
			UsedGB:  roundFloat(float64(diskUsage.Used)/(1024*1024*1024), 2),
			FreeGB:  roundFloat(float64(diskUsage.Free)/(1024*1024*1024), 2),
			Percent: roundFloat(diskUsage.UsedPercent, 2),
			DiskIO: DiskIO{
				ReadMB:  readMB,
				WriteMB: writeMB,
			},
		},
		Network: networkStats,
		GPU:     getGPUUsage(),
	}

	return metrics, nil
}

func metricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	metrics, err := getMetrics()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(metrics)
}

func main() {
	http.HandleFunc("/metrics", metricsHandler)

	fmt.Println("Server monitoring agent starting on port 5000...")
	fmt.Println("Metrics endpoint: http://localhost:5000/metrics")
	
	log.Fatal(http.ListenAndServe(":5000", nil))
}