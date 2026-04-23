import React, { useState, useEffect } from "react";
import { render, Text, Box, Newline } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import Spinner from "ink-spinner";
import { TaskList, Task as InkTask } from 'ink-task-list';
import spinners from 'cli-spinners';
import { WorkerTrackingPanel, TerminalStateMonitor } from './components/terminalState';
import { Task, listTasks } from '../src/runtime/patterns/taskStates';

/**
 * REDLOCK AuditorAi Elite Dashboard
 * A React-based terminal UI that provides a high-fidelity audit experience.
 */

interface MissionTask {
  label: string;
  state: 'pending' | 'loading' | 'success' | 'warning' | 'error';
}

interface DashboardProps {
  targetUrl: string;
  profile: string;
  status: string;
  logs: string[];
  tasks: MissionTask[];
  workspacePath: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  targetUrl,
  profile,
  status,
  logs,
  tasks,
  workspacePath,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [liveTasks, setLiveTasks] = useState<Task[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    // Poll task state every 2 seconds
    const taskPoller = setInterval(async () => {
      const tasks = await listTasks();
      setLiveTasks(tasks);
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(taskPoller);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* HEADER */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={1}>
        <Gradient name="cristal">
          <BigText text="REDLOCK" font="tiny" />
        </Gradient>
        <Box borderStyle="double" borderColor="red" paddingX={1}>
          <Text color="red" bold> MISSION ELAPSED: {formatTime(elapsed)} </Text>
        </Box>
      </Box>

      <Box borderStyle="round" borderColor="cyan" paddingX={2} marginBottom={1} justifyContent="center">
        <Text bold color="white">
          AUDITORAI MISSION CONTROL :: AUTONOMOUS INTELLIGENCE SWARM
        </Text>
      </Box>

      {/* METADATA BOX */}
      <Box flexDirection="row" marginBottom={1}>
        <Box borderStyle="single" borderColor="magenta" paddingX={1} marginRight={1} flexGrow={1}>
          <Box flexDirection="column">
            <Text color="gray">TARGET URL</Text>
            <Text color="white" bold wrap="truncate-end">{targetUrl || "N/A"}</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="blue" paddingX={1} marginRight={1} width={25}>
          <Box flexDirection="column">
            <Text color="gray">ACTIVE PROFILE</Text>
            <Text color="white" bold>{profile}</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="green" paddingX={1} width={35}>
          <Box flexDirection="column">
            <Text color="gray">RESEARCH VAULT</Text>
            <Text color="white" bold wrap="truncate-end">...{workspacePath.slice(-25)}</Text>
          </Box>
        </Box>
      </Box>

      {/* MISSION OBJECTIVES / TASKS */}
      <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} marginBottom={1}>
        <Text color="yellow" bold underline>STRATEGIC MISSION OBJECTIVES</Text>
        <Box marginTop={1}>
          <TaskList>
            {tasks.length > 0 ? (
              tasks.map((task, i) => {
                const taskProps: any = {
                  label: task.label,
                  state: task.state,
                };
                if (task.state === "loading") taskProps.spinner = spinners.dots;
                return <InkTask key={i} {...taskProps} />;
              })
            ) : (
              <InkTask label="Deploying Swarm Intelligence..." state="loading" spinner={spinners.dots} />
            )}
          </TaskList>
        </Box>
      </Box>

      {/* STATUS & PROGRESS */}
      <Box marginBottom={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text color="cyan" bold>  CURRENT OPERATIONAL PHASE: </Text>
        <Text italic color="white">{status.toUpperCase()}</Text>
      </Box>

      {/* RECENT LOGS */}
      <Box flexDirection="column" borderStyle="classic" borderColor="green" paddingX={1} minHeight={10}>
        <Text color="green" bold underline>LIVE INTELLIGENCE FEED [TOP 8 SIGNALS]</Text>
        <Box flexDirection="column" marginTop={1}>
          {logs.slice(-8).map((log, i) => (
            <Text key={i} color="white" wrap="truncate-end">
              <Text color="gray">[{i.toString().padStart(2, "0")}] </Text>
              {log}
            </Text>
          ))}
        </Box>
      </Box>

      {/* TERMINAL STATE MONITOR */}
      <TerminalStateMonitor tasks={liveTasks} />

      {/* WORKER AGENT PANEL */}
      <WorkerTrackingPanel
        workers={liveTasks
          .filter(t => t.owner)
          .map(t => ({
            id: t.owner!,
            name: `Worker ${t.owner!.slice(0, 6)}`,
            status: t.status,
            currentTask: t.subject,
            progress: t.metadata?.progress ?? 0,
            lastHeartbeat: Date.parse(t.updatedAt) || Date.now(),
            tasksCompleted: liveTasks.filter(lt => lt.owner === t.owner && lt.status === 'completed').length
          }))
          // Deduplicate workers
          .filter((worker, index, self) =>
            index === self.findIndex(w => w.id === worker.id)
          )
        }
      />

      <Box marginTop={1} justifyContent="space-between">
        <Box>
          <Text color="gray">Press </Text>
          <Text color="red" bold>CTRL+C</Text>
          <Text color="gray"> to abort audit.</Text>
        </Box>
        <Text color="dim">REDLOCK-AUDITORAI-V2.0</Text>
      </Box>
    </Box>
  );
};
