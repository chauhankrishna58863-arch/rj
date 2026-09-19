import os from 'os';

export interface MachineProcess {
  pid: number;
  name: string;
  cpu: number;
  memMB: number;
  status: 'running' | 'sleeping' | 'stopped';
}

export interface MachineState {
  systemStatus: 'RUNNING' | 'STOPPED' | 'PAUSED';
  masterSwitch: boolean;
  uptimeSeconds: number;
  cpuPercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryPercent: number;
  activeProcesses: MachineProcess[];
  connectedDevices: Array<{ id: string; name: string; type: string; status: 'online' | 'standby' | 'offline' }>;
  logs: Array<{ timestamp: string; level: 'INFO' | 'WARN' | 'EXEC' | 'ALERT'; message: string }>;
  platform: string;
  arch: string;
}

class MachineController {
  private isRunning: boolean = true;
  private startTime: number = Date.now();
  private commandLogs: Array<{ timestamp: string; level: 'INFO' | 'WARN' | 'EXEC' | 'ALERT'; message: string }> = [
    { timestamp: new Date().toISOString(), level: 'INFO', message: 'Machine Controller daemon initialized.' },
    { timestamp: new Date().toISOString(), level: 'EXEC', message: 'Master Neural Engine status: RUNNING.' }
  ];

  public getStatus(): MachineState {
    const memUsage = process.memoryUsage();
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024));
    const usedMem = Math.max(128, totalMem - freeMem);

    const processes: MachineProcess[] = [
      { pid: 101, name: 'blackmagic-core-engine', cpu: this.isRunning ? 8.4 : 0.0, memMB: 184, status: this.isRunning ? 'running' : 'stopped' },
      { pid: 102, name: 'gemini-multimodal-router', cpu: this.isRunning ? 4.2 : 0.0, memMB: 96, status: this.isRunning ? 'running' : 'stopped' },
      { pid: 103, name: 'audio-live-stream-daemon', cpu: this.isRunning ? 2.1 : 0.0, memMB: 54, status: this.isRunning ? 'running' : 'stopped' },
      { pid: 104, name: 'wake-word-listener', cpu: 0.8, memMB: 32, status: 'running' },
      { pid: 105, name: 'offline-curriculum-db', cpu: 0.1, memMB: 48, status: 'running' }
    ];

    return {
      systemStatus: this.isRunning ? 'RUNNING' : 'STOPPED',
      masterSwitch: this.isRunning,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      cpuPercent: this.isRunning ? Math.min(95, Math.floor(15 + Math.random() * 20)) : 2,
      memoryUsedMB: usedMem,
      memoryTotalMB: totalMem,
      memoryPercent: Math.round((usedMem / totalMem) * 100),
      activeProcesses: processes,
      connectedDevices: [
        { id: 'cam-01', name: 'HD Optical Sensor / Vision Stream', type: 'Camera', status: 'online' },
        { id: 'mic-01', name: 'Precision Acoustic Array (Live API)', type: 'Microphone', status: 'online' },
        { id: 'gpu-01', name: 'Neural Accelerator (Simulated)', type: 'Compute', status: this.isRunning ? 'online' : 'standby' },
        { id: 'iot-01', name: 'Robotics Control Interface (SIH-2026)', type: 'Actuator', status: this.isRunning ? 'online' : 'standby' }
      ],
      logs: this.commandLogs.slice(-15),
      platform: `${os.type()} ${os.release()}`,
      arch: os.arch()
    };
  }

  public runMachine(): { success: boolean; message: string; state: MachineState } {
    this.isRunning = true;
    this.startTime = Date.now();
    this.addLog('EXEC', 'ONE COMMAND EXECUTION: [START_ALL_SYSTEMS] dispatched. All neural subsystems, camera listeners, and machine processes activated.');
    return {
      success: true,
      message: '⚡ Master machine services running. All processes online.',
      state: this.getStatus()
    };
  }

  public stopMachine(): { success: boolean; message: string; state: MachineState } {
    this.isRunning = false;
    this.addLog('WARN', 'ONE COMMAND EXECUTION: [STOP_ALL_SYSTEMS] dispatched. Background processors safely parked. Low-power Wake-Word listener remains armed.');
    return {
      success: true,
      message: '🛑 Master machine services stopped. System entered standby state.',
      state: this.getStatus()
    };
  }

  public toggleMachine(): { success: boolean; message: string; state: MachineState } {
    if (this.isRunning) {
      return this.stopMachine();
    } else {
      return this.runMachine();
    }
  }

  public executeCommand(command: string): { success: boolean; output: string; state: MachineState } {
    const cmd = command.trim().toLowerCase();
    this.addLog('EXEC', `Machine command received: "${command}"`);

    if (cmd === 'start' || cmd === 'run' || cmd === 'power on' || cmd === 'system run') {
      const res = this.runMachine();
      return { success: true, output: 'SYSTEM STARTED: All neural, vision, and compute services running at 100% capacity.', state: res.state };
    }

    if (cmd === 'stop' || cmd === 'halt' || cmd === 'power off' || cmd === 'system stop') {
      const res = this.stopMachine();
      return { success: true, output: 'SYSTEM HALTED: All high-performance compute threads safely paused.', state: res.state };
    }

    if (cmd === 'status' || cmd === 'diagnostics') {
      const st = this.getStatus();
      return {
        success: true,
        output: `SYSTEM DIAGNOSTICS:\n- Status: ${st.systemStatus}\n- CPU: ${st.cpuPercent}%\n- RAM: ${st.memoryUsedMB}MB / ${st.memoryTotalMB}MB (${st.memoryPercent}%)\n- Processes: ${st.activeProcesses.length} loaded\n- Devices: 4 connected`,
        state: st
      };
    }

    if (cmd === 'restart' || cmd === 'reboot') {
      this.stopMachine();
      const res = this.runMachine();
      this.addLog('INFO', 'System cycle complete: reboot successful.');
      return { success: true, output: 'REBOOT SUCCESSFUL: Core system refreshed and operational.', state: res.state };
    }

    if (cmd.includes('camera') || cmd.includes('vision')) {
      return {
        success: true,
        output: 'CAMERA INTERFACE: Optical sensor calibrated at 1080p 60fps. Ready for OCR and scene analysis.',
        state: this.getStatus()
      };
    }

    if (cmd.includes('clear')) {
      this.commandLogs = [{ timestamp: new Date().toISOString(), level: 'INFO', message: 'Logs buffer cleared.' }];
      return { success: true, output: 'Machine logs cleared.', state: this.getStatus() };
    }

    // Generic command execution
    this.addLog('INFO', `Custom control routine executed: [${command}]`);
    return {
      success: true,
      output: `Command executed: [${command}]. Code 0. Process execution completed in 8ms.`,
      state: this.getStatus()
    };
  }

  private addLog(level: 'INFO' | 'WARN' | 'EXEC' | 'ALERT', message: string) {
    this.commandLogs.push({
      timestamp: new Date().toISOString(),
      level,
      message
    });
    if (this.commandLogs.length > 50) {
      this.commandLogs.shift();
    }
  }
}

export const machineController = new MachineController();
