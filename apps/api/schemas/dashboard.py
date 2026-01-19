"""
Dashboard Schemas
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import Field
from .base import AppBaseModel
from .audit import ActivityLogRead

class DashboardKPIs(AppBaseModel):
    total_patients: int = Field(0, alias="totalPatients")
    total_devices: int = Field(0, alias="totalDevices")
    available_devices: int = Field(0, alias="availableDevices")
    estimated_revenue: float = Field(0.0, alias="estimatedRevenue")
    
    # Extended fields for full dashboard
    today_appointments: Optional[int] = Field(None, alias="todayAppointments")
    todays_appointments: Optional[int] = Field(None, alias="todaysAppointments") # Alias parity
    active_trials: Optional[int] = Field(None, alias="activeTrials")
    daily_revenue: Optional[float] = Field(None, alias="dailyRevenue")
    pending_appointments: Optional[int] = Field(None, alias="pendingAppointments")
    ending_trials: Optional[int] = Field(None, alias="endingTrials")
    active_patients: Optional[int] = Field(None, alias="activePatients")
    monthly_revenue: Optional[float] = Field(None, alias="monthlyRevenue")

class ChartData(AppBaseModel):
    labels: List[str]
    monthly: List[Union[float, int]]

class RecentActivityResponse(AppBaseModel):
    activity: List[Dict[str, Any]] # Enriched logs

class BranchBreakdown(AppBaseModel):
    status: Dict[str, int] = {}
    segment: Dict[str, int] = {}
    acquisition_type: Dict[str, int] = Field({}, alias="acquisitionType")

class BranchDistribution(AppBaseModel):
    branch_id: str = Field(..., alias="branchId")
    branch: str
    breakdown: BranchBreakdown

class DashboardData(AppBaseModel):
    kpis: DashboardKPIs
    recent_activity: List[Dict[str, Any]] = Field(..., alias="recentActivity")
