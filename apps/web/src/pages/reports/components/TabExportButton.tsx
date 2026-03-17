import React from 'react';
import { Button } from '@x-ear/ui-web';
import { Download } from 'lucide-react';
import { exportRowsToCsv } from '../../../utils/report-export';

interface TabExportButtonProps {
  filename: string;
  rows: Array<Record<string, unknown>>;
  label?: string;
}

export function TabExportButton({ filename, rows, label = 'Excel İndir' }: TabExportButtonProps) {
  return (
    <Button
      onClick={() => exportRowsToCsv(filename, rows)}
      variant="outline"
      icon={<Download className="w-4 h-4" />}
      disabled={!rows.length}
    >
      {label}
    </Button>
  );
}
