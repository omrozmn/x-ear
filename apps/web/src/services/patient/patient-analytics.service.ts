/**
 * Patient Analytics Service
 * @fileoverview Handles patient analytics, statistics, and reporting
 * @version 1.0.0
 */

import { Patient } from '../../types/patient';
import { PatientStats, CityStats, StatusStats, SegmentStats } from '../../types/patient/patient-search.types';
import { PatientStatus, PatientSegment } from '../../types/patient/patient-base.types';

export interface AnalyticsTimeRange {
  start: string;
  end: string;
}

export interface PatientTrend {
  date: string;
  count: number;
  newPatients: number;
  activePatients: number;
}

export interface DeviceAnalytics {
  totalDevices: number;
  devicesByType: Record<string, number>;
  devicesBySide: Record<string, number>;
  averageDevicesPerPatient: number;
  patientsWithDevices: number;
  patientsWithoutDevices: number;
}

export interface SGKAnalytics {
  totalWithSGK: number;
  totalWithoutSGK: number;
  sgkCoverageRate: number;
  pendingSGKApplications: number;
  approvedSGKApplications: number;
  rejectedSGKApplications: number;
}

export interface AgeDistribution {
  ageGroup: string;
  count: number;
  percentage: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  averageRevenuePerPatient: number;
  outstandingBalance: number;
  collectionRate: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

export class PatientAnalyticsService {
  
  calculatePatientStats(patients: Patient[]): PatientStats {
    const totalPatients = patients.length;
    const activePatients = patients.filter(p => p.status === 'active').length;
    
    // Calculate new patients this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = patients.filter(p => 
      new Date(p.createdAt) >= thisMonth
    ).length;
    
    const withDevices = patients.filter(p => 
      p.devices && p.devices.length > 0
    ).length;
    
    const withInsurance = patients.filter(p => 
      p.sgkInfo && p.sgkInfo.insuranceType === 'sgk'
    ).length;
    
    // Calculate average age
    const patientsWithBirthDate = patients.filter(p => p.birthDate);
    const averageAge = patientsWithBirthDate.length > 0 
      ? patientsWithBirthDate.reduce((sum, p) => {
          const age = this.calculateAge(p.birthDate!);
          return sum + age;
        }, 0) / patientsWithBirthDate.length
      : 0;
    
    const topCities = this.calculateTopCities(patients);
    const statusDistribution = this.calculateStatusDistribution(patients);
    const segmentDistribution = this.calculateSegmentDistribution(patients);
    
    return {
      totalPatients,
      activePatients,
      newThisMonth,
      withDevices,
      withInsurance,
      averageAge: Math.round(averageAge),
      topCities,
      statusDistribution,
      segmentDistribution
    };
  }

  calculateDeviceAnalytics(patients: Patient[]): DeviceAnalytics {
    const allDevices = patients.flatMap(p => p.devices || []);
    const totalDevices = allDevices.length;
    
    const devicesByType: Record<string, number> = {};
    const devicesBySide: Record<string, number> = {};
    
    allDevices.forEach(device => {
      // Count by type
      const type = device.type || 'unknown';
      devicesByType[type] = (devicesByType[type] || 0) + 1;
      
      // Count by side
      const side = device.side || 'unknown';
      devicesBySide[side] = (devicesBySide[side] || 0) + 1;
    });
    
    const patientsWithDevices = patients.filter(p => 
      p.devices && p.devices.length > 0
    ).length;
    
    const patientsWithoutDevices = patients.length - patientsWithDevices;
    
    const averageDevicesPerPatient = patients.length > 0 
      ? totalDevices / patients.length 
      : 0;
    
    return {
      totalDevices,
      devicesByType,
      devicesBySide,
      averageDevicesPerPatient: Math.round(averageDevicesPerPatient * 100) / 100,
      patientsWithDevices,
      patientsWithoutDevices
    };
  }

  calculateSGKAnalytics(patients: Patient[]): SGKAnalytics {
    const totalWithSGK = patients.filter(p => 
      p.sgkInfo && p.sgkInfo.insuranceType === 'sgk'
    ).length;
    
    const totalWithoutSGK = patients.length - totalWithSGK;
    
    const sgkCoverageRate = patients.length > 0 
      ? (totalWithSGK / patients.length) * 100 
      : 0;
    
    // These would need to be calculated from actual SGK workflow data
    const pendingSGKApplications = patients.filter(p => 
      p.sgkInfo && p.sgkWorkflow?.currentStatus === 'pending'
    ).length;
    
    const approvedSGKApplications = patients.filter(p => 
      p.sgkInfo && p.sgkWorkflow?.currentStatus === 'approved'
    ).length;
    
    const rejectedSGKApplications = patients.filter(p => 
      p.sgkInfo && p.sgkWorkflow?.currentStatus === 'rejected'
    ).length;
    
    return {
      totalWithSGK,
      totalWithoutSGK,
      sgkCoverageRate: Math.round(sgkCoverageRate * 100) / 100,
      pendingSGKApplications,
      approvedSGKApplications,
      rejectedSGKApplications
    };
  }

  calculateAgeDistribution(patients: Patient[]): AgeDistribution[] {
    const ageGroups = {
      '0-18': 0,
      '19-30': 0,
      '31-45': 0,
      '46-60': 0,
      '61-75': 0,
      '76+': 0
    };
    
    const patientsWithBirthDate = patients.filter(p => p.birthDate);
    
    patientsWithBirthDate.forEach(patient => {
      const age = this.calculateAge(patient.birthDate!);
      
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 30) ageGroups['19-30']++;
      else if (age <= 45) ageGroups['31-45']++;
      else if (age <= 60) ageGroups['46-60']++;
      else if (age <= 75) ageGroups['61-75']++;
      else ageGroups['76+']++;
    });
    
    const total = patientsWithBirthDate.length;
    
    return Object.entries(ageGroups).map(([ageGroup, count]) => ({
      ageGroup,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0
    }));
  }

  calculatePatientTrends(patients: Patient[], timeRange: AnalyticsTimeRange): PatientTrend[] {
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);
    const trends: PatientTrend[] = [];
    
    // Group patients by date
    const patientsByDate: Record<string, Patient[]> = {};
    
    patients.forEach(patient => {
      const createdDate = new Date(patient.createdAt);
      if (createdDate >= startDate && createdDate <= endDate) {
        const dateKey = createdDate.toISOString().split('T')[0];
        if (!patientsByDate[dateKey]) {
          patientsByDate[dateKey] = [];
        }
        patientsByDate[dateKey].push(patient);
      }
    });
    
    // Generate trend data for each day in range
    const currentDate = new Date(startDate);
    let cumulativeCount = 0;
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayPatients = patientsByDate[dateKey] || [];
      const newPatients = dayPatients.length;
      const activePatients = dayPatients.filter(p => p.status === 'active').length;
      
      cumulativeCount += newPatients;
      
      trends.push({
        date: dateKey,
        count: cumulativeCount,
        newPatients,
        activePatients
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return trends;
  }

  calculateRevenueAnalytics(patients: Patient[]): RevenueAnalytics {
    // This is a placeholder implementation
    // In a real application, this would calculate from actual financial data
    
    let totalRevenue = 0;
    let outstandingBalance = 0;
    
    patients.forEach(patient => {
      // These calculations would be based on actual purchase/payment data
      if (patient.devices && patient.devices.length > 0) {
        patient.devices.forEach(device => {
          // Estimate revenue based on device type
          const deviceRevenue = this.estimateDeviceRevenue(device.type);
          totalRevenue += deviceRevenue;
          
          // Estimate outstanding balance (placeholder)
          if (Math.random() > 0.8) { // 20% chance of outstanding balance
            outstandingBalance += deviceRevenue * 0.3;
          }
        });
      }
    });
    
    const averageRevenuePerPatient = patients.length > 0 
      ? totalRevenue / patients.length 
      : 0;
    
    const collectionRate = totalRevenue > 0 
      ? ((totalRevenue - outstandingBalance) / totalRevenue) * 100 
      : 100;
    
    // Generate monthly revenue (placeholder)
    const monthlyRevenue = this.generateMonthlyRevenue(totalRevenue);
    
    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageRevenuePerPatient: Math.round(averageRevenuePerPatient * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,
      monthlyRevenue
    };
  }

  private calculateTopCities(patients: Patient[]): CityStats[] {
    const cityCount: Record<string, number> = {};
    const total = patients.length;
    
    patients.forEach(patient => {
      // Extract city from address string (assuming format like "City, District")
      const addressParts = patient.address?.split(',') || [];
      const city = addressParts[0]?.trim() || 'Unknown';
      cityCount[city] = (cityCount[city] || 0) + 1;
    });
    
    return Object.entries(cityCount)
      .map(([city, count]) => ({
        city,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 cities
  }

  private calculateStatusDistribution(patients: Patient[]): StatusStats[] {
    const statusCount: Record<PatientStatus, number> = {} as Record<PatientStatus, number>;
    const total = patients.length;
    
    patients.forEach(patient => {
      const status = patient.status;
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    return Object.entries(statusCount).map(([status, count]) => ({
      status: status as PatientStatus,
      count,
      percentage: Math.round((count / total) * 100 * 100) / 100
    }));
  }

  private calculateSegmentDistribution(patients: Patient[]): SegmentStats[] {
    const segmentCount: Record<PatientSegment, number> = {} as Record<PatientSegment, number>;
    const total = patients.length;
    
    patients.forEach(patient => {
      const segment = patient.segment;
      segmentCount[segment] = (segmentCount[segment] || 0) + 1;
    });
    
    return Object.entries(segmentCount).map(([segment, count]) => ({
      segment: segment as PatientSegment,
      count,
      percentage: Math.round((count / total) * 100 * 100) / 100
    }));
  }

  private calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private estimateDeviceRevenue(deviceType: string): number {
    // Placeholder revenue estimation based on device type
    const revenueMap: Record<string, number> = {
      'hearing_aid': 15000,
      'cochlear_implant': 80000,
      'bone_anchored': 45000,
      'middle_ear': 35000,
      'tinnitus_masker': 8000,
      'fm_system': 5000
    };
    
    return revenueMap[deviceType] || 10000;
  }

  private generateMonthlyRevenue(totalRevenue: number): Array<{ month: string; revenue: number }> {
    const months = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
      
      // Distribute revenue randomly across months (placeholder)
      const monthlyRevenue = Math.round((totalRevenue / 12) * (0.5 + Math.random()) * 100) / 100;
      
      months.push({
        month: monthName,
        revenue: monthlyRevenue
      });
    }
    
    return months;
  }
}

export const patientAnalyticsService = new PatientAnalyticsService();