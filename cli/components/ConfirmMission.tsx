import React, { useState, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import chalk from 'chalk';
import figures from 'figures';

interface ConfirmMissionProps {
  message: string;
  onDone: (result: boolean) => void;
}

/**
 * Tactical Confirmation Component
 * A premium React-based dialog for mission critical decisions.
 */
export const ConfirmMission: React.FC<ConfirmMissionProps> = ({ message, onDone }) => {
  const [selected, setSelected] = useState(true);

  useInput((input: string, key: any) => {
    if (key.leftArrow || key.rightArrow || input === 'h' || input === 'l') {
      setSelected(!selected);
    }
    if (key.return) {
      onDone(selected);
    }
    if (input.toLowerCase() === 'y') onDone(true);
    if (input.toLowerCase() === 'n') onDone(false);
  });

  return (
    <Box flexDirection="column" paddingY={1} paddingX={2} borderStyle="round" borderColor="red">
      <Box marginBottom={1}>
        <Text bold color="red">{figures.warning} MISSION CRITICAL DECISION</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="white">{message}</Text>
      </Box>

      <Box flexDirection="row">
        <Box marginRight={4}>
          <Text color={selected ? 'red' : 'gray'} bold={selected}>
            {selected ? figures.pointer : ' '} [ YES, INITIALIZE ]
          </Text>
        </Box>
        <Box>
          <Text color={!selected ? 'red' : 'gray'} bold={!selected}>
            {!selected ? figures.pointer : ' '} [ NO, ABORT ]
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Use arrow keys to select, Enter to confirm</Text>
      </Box>
    </Box>
  );
};
