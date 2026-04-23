import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import spinners from 'cli-spinners';
import { TaskStatus, isTerminalStatus } from "../../src/runtime/patterns/taskStates";

/**
 * Terminal State Detection UI Components
 * Animated spinners, status indicators and worker tracking panels
 * for REDLOCK AuditorAi TUI Dashboard
 */

// ────────────────────────────────────────────────────────────
// ANIMATED SPINNER COMPONENTS
// ────────────────────────────────────────────────────────────

interface TacticalSpinnerProps {
    type?: keyof typeof spinners;
    color?: string;
    active?: boolean;
}

export const TacticalSpinner: React.FC<TacticalSpinnerProps> = ({
    type = 'dots',
    color = 'cyan',
    active = true
}) => {
    const [frame, setFrame] = useState(0);
    const spinner = spinners[type];

    useEffect(() => {
        if (!active) return;

        const interval = setInterval(() => {
            setFrame(prev => (prev + 1) % spinner.frames.length);
        }, spinner.interval);

        return () => clearInterval(interval);
    }, [active, spinner]);

    return active
        ? <Text color={color}>{spinner.frames[frame]}</Text>
        : <Text> </Text>;
};

interface MultiSpinnerProps {
    count: number;
    offset?: number;
}

export const SwarmSpinner: React.FC<MultiSpinnerProps> = ({ count, offset = 0 }) => {
    return (
        <Box>
            {Array.from({ length: count }).map((_, i) => (
                <TacticalSpinner
                    key={i}
                    type="dots"
                    color={['cyan', 'magenta', 'green', 'yellow', 'red'][i % 5]}
                />
            ))}
        </Box>
    );
};

// ────────────────────────────────────────────────────────────
// STATUS INDICATOR BADGES
// ────────────────────────────────────────────────────────────

interface StatusBadgeProps {
    status: TaskStatus;
    showSpinner?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showSpinner = true }) => {
    const statusConfig: Record<TaskStatus, { color: string; symbol: string; label: string }> = {
        pending: { color: 'gray', symbol: '○', label: 'PENDING' },
        scheduled: { color: 'yellow', symbol: '◐', label: 'SCHEDULED' },
        running: { color: 'cyan', symbol: '●', label: 'RUNNING' },
        paused: { color: 'yellow', symbol: '||', label: 'PAUSED' },
        success: { color: 'green', symbol: '✓', label: 'SUCCESS' },
        warning: { color: 'yellow', symbol: '!', label: 'WARNING' },
        error: { color: 'red', symbol: '✗', label: 'ERROR' },
        completed: { color: 'green', symbol: '✓', label: 'COMPLETED' },
        failed: { color: 'red', symbol: '✗', label: 'FAILED' },
        killed: { color: 'red', symbol: '[X]', label: 'KILLED' },
        cancelled: { color: 'gray', symbol: '(/)', label: 'CANCELLED' },
        timeout: { color: 'orange', symbol: '[!]', label: 'TIMEOUT' },
    };

    const config = statusConfig[status];
    const isActive = status === 'running';
    const isTerminal = isTerminalStatus(status);

    return (
        <Box gap={1} alignItems="center">
            {isActive && showSpinner
                ? <TacticalSpinner type="dots12" color={config.color} />
                : <Text color={config.color} bold>{config.symbol}</Text>
            }
            <Text color={!isActive && !isTerminal ? "gray" : config.color} bold={isTerminal}>
                {config.label}
            </Text>
        </Box>
    );
};

// ────────────────────────────────────────────────────────────
// PROGRESS BAR COMPONENT
// ────────────────────────────────────────────────────────────

interface ProgressBarProps {
    value: number;
    max?: number;
    width?: number;
    color?: string;
    showPercent?: boolean;
}

export const TacticalProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    width = 30,
    color = 'green',
    showPercent = true
}) => {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;

    return (
        <Box gap={1} alignItems="center">
            <Text>
                <Text color={color} bold>█</Text>
                <Text color={color}>{'█'.repeat(Math.max(0, filled - 1))}</Text>
                <Text color="gray">{'░'.repeat(empty)}</Text>
            </Text>
            {showPercent && (
                <Text color={color}>{percent.toFixed(0).padStart(3)}%</Text>
            )}
        </Box>
    );
};

// ────────────────────────────────────────────────────────────
// WORKER TRACKING PANEL
// ────────────────────────────────────────────────────────────

interface Worker {
    id: string;
    name: string;
    status: TaskStatus;
    currentTask?: string;
    progress?: number;
    lastHeartbeat: number;
    tasksCompleted: number;
}

interface WorkerPanelProps {
    workers: Worker[];
    title?: string;
}

export const WorkerTrackingPanel: React.FC<WorkerPanelProps> = ({ workers, title = 'AGENT SWARM STATUS' }) => {
    const activeWorkers = workers.filter(w => w.status === 'running').length;
    const completedWorkers = workers.filter(w => isTerminalStatus(w.status)).length;

    return (
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1} marginTop={1}>
            <Box justifyContent="space-between" alignItems="center">
                <Text color="magenta" bold underline>{title}</Text>
                <Box gap={2}>
                    <Text color="cyan">ACTIVE: {activeWorkers}</Text>
                    <Text color="green">DONE: {completedWorkers}</Text>
                    <Text color="gray">TOTAL: {workers.length}</Text>
                </Box>
            </Box>

            <Box flexDirection="column" marginTop={1} gap={1}>
                {workers.map(worker => (
                    <Box key={worker.id} flexDirection="row" justifyContent="space-between" alignItems="center">
                        <Box gap={1} alignItems="center" width={20}>
                            <StatusBadge status={worker.status} showSpinner={false} />
                            <Text color="white" bold>{worker.name.padEnd(12)}</Text>
                        </Box>

                        <Box flexGrow={1} marginX={1}>
                            {worker.currentTask
                                ? <Text color="gray" wrap="truncate-end">{worker.currentTask}</Text>
                                : <Text color="dim">Idle</Text>
                            }
                        </Box>

                        <Box width={50}>
                            <TacticalProgressBar
                                value={worker.progress ?? 0}
                                width={25}
                                color={
                                    worker.status === 'running' ? 'cyan' :
                                        worker.status === 'completed' ? 'green' :
                                            worker.status === 'failed' ? 'red' : 'gray'
                                }
                            />
                        </Box>

                        <Box width={12} justifyContent="flex-end">
                            <Text color="yellow">{worker.tasksCompleted} tasks</Text>
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

// ────────────────────────────────────────────────────────────
// TERMINAL STATE DETECTOR
// ────────────────────────────────────────────────────────────

interface TerminalStateMonitorProps {
    tasks: Array<{ status: TaskStatus; id: string; subject: string }>;
}

export const TerminalStateMonitor: React.FC<TerminalStateMonitorProps> = ({ tasks }) => {
    const terminalCount = tasks.filter(t => isTerminalStatus(t.status)).length;
    const runningCount = tasks.filter(t => t.status === 'running').length;
    const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'scheduled').length;
    const failedCount = tasks.filter(t => t.status === 'failed' || t.status === 'timeout' || t.status === 'killed').length;

    const total = tasks.length;
    const completionRate = total > 0 ? (terminalCount / total) * 100 : 0;

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginTop={1}>
            <Text color="cyan" bold>TERMINAL STATE DETECTION SYSTEM</Text>

            <Box flexDirection="row" gap={3} marginTop={1}>
                <Box>
                    <Text color="gray">PENDING</Text>
                    <Text color="yellow" bold>{pendingCount}</Text>
                </Box>
                <Box>
                    <Text color="gray">RUNNING</Text>
                    <Text color="cyan" bold>{runningCount}</Text>
                </Box>
                <Box>
                    <Text color="gray">TERMINAL</Text>
                    <Text color="green" bold>{terminalCount}</Text>
                </Box>
                <Box>
                    <Text color="gray">FAILED</Text>
                    <Text color="red" bold>{failedCount}</Text>
                </Box>
                <Box flexGrow={1} alignItems="flex-end">
                    <TacticalProgressBar value={completionRate} width={35} color="cyan" />
                </Box>
            </Box>
        </Box>
    );
};

export default {
    TacticalSpinner,
    SwarmSpinner,
    StatusBadge,
    TacticalProgressBar,
    WorkerTrackingPanel,
    TerminalStateMonitor
};
