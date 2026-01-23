/**
 * Party Analytics Service
 * @fileoverview Handles party analytics, statistics, and reporting
 * @version 1.0.0
 */

import type { PartyRead, PartyReadStatus, SaleRead } from '@/api/generated/schemas';
import type { DeviceRead } from '@/api/generated/schemas/deviceRead';

export interface AnalyticsTimeRange {
  start: string;
  end: string;
}

export interface PartyTrend {
  date: string;
  count: number;
  newParties: number;
  activeParties: number;
}

export interface DeviceAnalytics {
  totalDevices: number;
  devicesByType: Record<string, number>;
  devicesBySide: Record<string, number>;
  averageDevicesPerParty: number;
  partiesWithDevices: number;
  partiesWithoutDevices: number;
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
  averageRevenuePerParty: number;
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
  status: PartyReadStatus;
  count: number;
  percentage: number;
}

export interface SegmentStats {
  segment: string;
  count: number;
  percentage: number;
}

export interface PartyStats {
  totalParties: number;
  activeParties: number;
  newThisMonth: number;
  withDevices: number;
  withInsurance: number;
  averageAge: number;
  topCities: CityStats[];
  statusDistribution: StatusStats[];
  segmentDistribution: SegmentStats[];
}

export class PartyAnalyticsService {

  calculatePartyStats(parties: PartyRead[], devices: DeviceRead[] = [], sales: SaleRead[] = []): PartyStats {
    const totalParties = parties.length;
    const activeParties = parties.filter(p => p.status === 'ACTIVE').length;

    // Calculate new parties this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const newThisMonth = parties.filter(p =>
      p.createdAt && new Date(p.createdAt) >= thisMonth
    ).length;

    // Calculate parties with devices (from separate devices array)
    const partiesWithDevices = new Set(devices.map(d => d.partyId).filter(Boolean)).size;

    const withInsurance = parties.filter(p =>
      p.sgkInfo && Object.keys(p.sgkInfo).length > 0
    ).length;

    // Calculate average age
    const partiesWithBirthDate = parties.filter(p => p.birthDate);
    const averageAge = partiesWithBirthDate.length > 0
      ? partiesWithBirthDate.reduce((sum, p) => {
        const age = this.calculateAge(p.birthDate!);
        return sum + age;
      }, 0) / partiesWithBirthDate.length
      : 0;

    const topCities = this.calculateTopCities(parties);
    const statusDistribution = this.calculateStatusDistribution(parties);
    const segmentDistribution = this.calculateSegmentDistribution(parties);

    return {
      totalParties,
      activeParties,
      newThisMonth,
      withDevices: partiesWithDevices,
      withInsurance,
      averageAge: Math.round(averageAge),
      topCities,
      statusDistribution,
      segmentDistribution
    };
  }

  calculateDeviceAnalytics(parties: PartyRead[], devices: DeviceRead[]): DeviceAnalytics {
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

    // Calculate parties with devices
    const partiesWithDevices = new Set(devices.map(d => d.partyId).filter(Boolean)).size;
    const partiesWithoutDevices = parties.length - partiesWithDevices;

    const averageDevicesPerParty = parties.length > 0
      ? totalDevices / parties.length
      : 0;

    return {
      totalDevices,
      devicesByType,
      devicesBySide,
      averageDevicesPerParty: Math.round(averageDevicesPerParty * 100) / 100,
      partiesWithDevices,
      partiesWithoutDevices
    };
  }

  calculateSGKAnalytics(parties: PartyRead[]): SGKAnalytics {
    const totalWithSGK = parties.filter(p =>
      p.sgkInfo && Object.keys(p.sgkInfo).length > 0
    ).length;

    const totalWithoutSGK = parties.length - totalWithSGK;

    const sgkCoverageRate = parties.length > 0
      ? (totalWithSGK / parties.length) * 100
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

  calculateAgeDistribution(parties: PartyRead[]): AgeDistribution[] {
    const ageGroups = {
      '0-18': 0,
      '19-30': 0,
      '31-45': 0,
      '46-60': 0,
      '61-75': 0,
      '76+': 0
    };

    const partiesWithBirthDate = parties.filter(p => p.birthDate);

    partiesWithBirthDate.forEach(party => {
      const age = this.calculateAge(party.birthDate!);

      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 30) ageGroups['19-30']++;
      else if (age <= 45) ageGroups['31-45']++;
      else if (age <= 60) ageGroups['46-60']++;
      else if (age <= 75) ageGroups['61-75']++;
      else ageGroups['76+']++;
    });

    const total = partiesWithBirthDate.length;

    return Object.entries(ageGroups).map(([ageGroup, count]) => ({
      ageGroup,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0
    }));
  }

  calculatePartyTrends(parties: PartyRead[], timeRange: AnalyticsTimeRange): PartyTrend[] {
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);
    const trends: PartyTrend[] = [];

    // Group parties by date
    const partiesByDate: Record<string, PartyRead[]> = {};

    parties.forEach(party => {
      const createdDate = party.createdAt ? new Date(party.createdAt) : new Date();
      if (createdDate >= startDate && createdDate <= endDate) {
        const dateKey = createdDate.toISOString().split('T')[0];
        if (!partiesByDate[dateKey]) {
          partiesByDate[dateKey] = [];
        }
        partiesByDate[dateKey].push(party);
      }
    });

    // Generate trend data for each day in range
    const currentDate = new Date(startDate);
    let cumulativeCount = 0;

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayParties = partiesByDate[dateKey] || [];
      const newParties = dayParties.length;
      const activeParties = dayParties.filter(p => p.status === 'ACTIVE').length;

      cumulativeCount += newParties;

      trends.push({
        date: dateKey,
        count: cumulativeCount,
        newParties,
        activeParties
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  calculateRevenueAnalytics(parties: PartyRead[], sales: SaleRead[]): RevenueAnalytics {
    let totalRevenue = 0;
    let outstandingBalance = 0;

    sales.forEach(sale => {
      const amount = sale.totalAmount || 0;
      totalRevenue += amount;

      // Estimate outstanding balance (placeholder logic)
      if (Math.random() > 0.8) { // 20% chance of outstanding balance
        outstandingBalance += amount * 0.3;
      }
    });

    const averageRevenuePerParty = parties.length > 0
      ? totalRevenue / parties.length
      : 0;

    const collectionRate = totalRevenue > 0
      ? ((totalRevenue - outstandingBalance) / totalRevenue) * 100
      : 100;

    // Generate monthly revenue (placeholder)
    const monthlyRevenue = this.generateMonthlyRevenue(totalRevenue);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageRevenuePerParty: Math.round(averageRevenuePerParty * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,
      monthlyRevenue
    };
  }

  private calculateTopCities(parties: PartyRead[]): CityStats[] {
    const cityCount: Record<string, number> = {};
    const total = parties.length;

    parties.forEach(party => {
      const city = party.addressCity || 'Unknown';
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

  private calculateStatusDistribution(parties: PartyRead[]): StatusStats[] {
    const statusCount: Record<string, number> = {};
    const total = parties.length;

    parties.forEach(party => {
      const status = party.status || 'ACTIVE';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const allowedStatuses: PartyReadStatus[] = ['ACTIVE', 'INACTIVE', 'LEAD', 'TRIAL', 'CUSTOMER'];
    return Object.entries(statusCount).map(([status, count]) => {
      const validStatus = allowedStatuses.includes(status as PartyReadStatus) ? status as PartyReadStatus : 'ACTIVE';
      return {
        status: validStatus,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100
      };
    });
  }

  private calculateSegmentDistribution(parties: PartyRead[]): SegmentStats[] {
    const segmentCount: Record<string, number> = {};
    const total = parties.length;

    parties.forEach(party => {
      const segment = party.segment || 'NEW';
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
