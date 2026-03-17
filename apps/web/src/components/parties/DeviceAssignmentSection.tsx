import React from 'react';
import { Shield } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface DeviceAssignment {
  id: string;
  deviceId: string;
  deviceName: string;
  earSide: string;
  assignedDate: string;
  status: string;
  serialNumber: string;
}

interface DeviceAssignmentSectionProps {
  deviceAssignments: DeviceAssignment[];
  deviceAssignmentsLoading: boolean;
}

export const DeviceAssignmentSection: React.FC<DeviceAssignmentSectionProps> = ({
  deviceAssignments,
  deviceAssignmentsLoading
}) => {
  return (
    <div className="bg-card rounded-2xl border p-6">
      <h3 className="text-lg font-semibold mb-4">Cihaz Atama</h3>

      {deviceAssignmentsLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : deviceAssignments.length > 0 ? (
        <div className="space-y-3">
          {deviceAssignments.map((assignment) => (
            <div key={assignment.id} className="border rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h5 className="font-medium">{assignment.deviceName}</h5>
                  <p className="text-sm text-muted-foreground">Kulak: {assignment.earSide === 'LEFT' ? 'Sol' : 'Sağ'}</p>
                  <p className="text-sm text-muted-foreground">Seri No: {assignment.serialNumber}</p>
                  <p className="text-sm text-muted-foreground">Atama Tarihi: {new Date(assignment.assignedDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <StatusBadge status={assignment.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Henüz cihaz ataması yapılmamış.</p>
        </div>
      )}
    </div>
  );
};