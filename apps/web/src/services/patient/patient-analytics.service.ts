/**
 * Patient Analytics Service
 * @fileoverview Handles patient analytics, statistics, and reporting
 * @version 1.0.0
 */

import type { PatientRead, DeviceRead, PatientReadStatus } from '@/api/generated/schemas';
// Fallback type for Sale since strict type is missing in schemas
export type SaleRead = any;

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

export interface CityStats {
  city: string;
  count: number;
  percentage: number;
}

export interface StatusStats {
  status: PatientReadStatus;
  count: number;
  percentage: number;
}

export interface SegmentStats {
  segment: string;
  count: number;
  percentage: number;
}

export interface PatientStats {
  totalPatients: number;
  activePatients: number;
  newThisMonth: number;
  withDevices: number;
  withInsurance: number;
  averageAge: number;
  topCities: CityStats[];
  statusDistribution: StatusStats[];
  segmentDistribution: SegmentStats[];
}

export class PatientAnalyticsService {

  calculatePatientStats(patients: PatientRead[], devices: DeviceRead[] = [], sales: SaleRead[] = []): PatientStats {
    const totalPatients = patients.length;
    const activePatients = patients.filter(p => p.status === 'ACTIVE').length;

    // Calculate new patients this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const newThisMonth = patients.filter(p =>
      p.createdAt && new Date(p.createdAt) >= thisMonth
    ).length;

    // Calculate patients with devices (from separate devices array)
    const patientsWithDevices = new Set(devices.map(d => d.patientId).filter(Boolean)).size;

    const withInsurance = patients.filter(p =>
      p.sgkInfo && Object.keys(p.sgkInfo).length > 0
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
      withDevices: patientsWithDevices,
      withInsurance,
      averageAge: Math.round(averageAge),
      topCities,
      statusDistribution,
      segmentDistribution
    };
  }

  calculateDeviceAnalytics(patients: PatientRead[], devices: DeviceRead[]): DeviceAnalytics {
    const totalDevices = devices.length;

    const devicesByType: Record<string, number> = {};
    const devicesBySide: Record<string, number> = {};

    devices.forEach(device => {
      // Count by device type
      const deviceType = device.category || 'unknown';
      devicesByType[deviceType] = (devicesByType[deviceType] || 0) + 1;

      // Count by ear/side
      const side = device.ear || 'unknown';
      devicesBySide[side] = (devicesBySide[side] || 0) + 1;
    });

    // Calculate patients with devices
    const patientsWithDevices = new Set(devices.map(d => d.patientId).filter(Boolean)).size;
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

  calculateSGKAnalytics(patients: PatientRead[]): SGKAnalytics {
    const totalWithSGK = patients.filter(p =>
      p.sgkInfo && Object.keys(p.sgkInfo).length > 0
    ).length;

    const totalWithoutSGK = patients.length - totalWithSGK;

    const sgkCoverageRate = patients.length > 0
      ? (totalWithSGK / patients.length) * 100
      : 0;

    // SGK workflow data would need to be fetched separately from SGK processing endpoints
    // For now, return placeholder values
    const pendingSGKApplications = 0;
    const approvedSGKApplications = 0;
    const rejectedSGKApplications = 0;

    return {
      totalWithSGK,
      totalWithoutSGK,
      sgkCoverageRate: Math.round(sgkCoverageRate * 100) / 100,
      pendingSGKApplications,
      approvedSGKApplications,
      rejectedSGKApplications
    };
  }

  calculateAgeDistribution(patients: PatientRead[]): AgeDistribution[] {
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

  calculatePatientTrends(patients: PatientRead[], timeRange: AnalyticsTimeRange): PatientTrend[] {
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);
    const trends: PatientTrend[] = [];

    // Group patients by date
    const patientsByDate: Record<string, PatientRead[]> = {};

    patients.forEach(patient => {
      const createdDate = patient.createdAt ? new Date(patient.createdAt) : new Date();
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
      const activePatients = dayPatients.filter(p => p.status === 'ACTIVE').length;

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

  calculateRevenueAnalytics(patients: PatientRead[], sales: SaleRead[]): RevenueAnalytics {
    let totalRevenue = 0;
    let outstandingBalance = 0;

    sales.forEach(sale => {
      totalRevenue += sale.totalAmount;

      // Estimate outstanding balance (placeholder logic)
      if (Math.random() > 0.8) { // 20% chance of outstanding balance
        outstandingBalance += sale.totalAmount * 0.3;
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

  private calculateTopCities(patients: PatientRead[]): CityStats[] {
    const cityCount: Record<string, number> = {};
    const total = patients.length;

    patients.forEach(patient => {
      const city = patient.addressCity || 'Unknown';
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

  private calculateStatusDistribution(patients: PatientRead[]): StatusStats[] {
    const statusCount: Record<string, number> = {};
    const total = patients.length;

    patients.forEach(patient => {
      const status = patient.status || 'ACTIVE';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const allowedStatuses: PatientReadStatus[] = ['ACTIVE', 'INACTIVE', 'LEAD', 'TRIAL', 'CUSTOMER'];
    return Object.entries(statusCount).map(([status, count]) => {
      const validStatus = allowedStatuses.includes(status as PatientReadStatus) ? status as PatientReadStatus : 'ACTIVE';
      return {
        status: validStatus,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100
      };
    });
  }

  private calculateSegmentDistribution(patients: PatientRead[]): SegmentStats[] {
    const segmentCount: Record<string, number> = {};
    const total = patients.length;

    patients.forEach(patient => {
      const segment = patient.segment || 'NEW';
      segmentCount[segment] = (segmentCount[segment] || 0) + 1;
    });

    const allowedSegments: string[] = ['NEW', 'EXISTING', 'VIP'];
    return Object.entries(segmentCount).map(([segment, count]) => {
      const validSegment = allowedSegments.includes(segment) ? segment : 'NEW';
      return {
        segment: validSegment,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100
      };
    });
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

  private generateMonthlyRevenue(totalRevenue: number): Array<{ month: string; revenue: number }> {
    const months: Array<{ month: string; revenue: number }> = [];
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
