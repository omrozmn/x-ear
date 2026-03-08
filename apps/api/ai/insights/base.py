import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class BaseAnalyzer(ABC):
    """
    Standard interface for all 60 proactive insights.
    """
    def __init__(self, db: Session):
        self.db = db

    @property
    @abstractmethod
    def insight_id(self) -> str:
        """e.g., 'PC-001'"""
        ...

    @property
    @abstractmethod
    def schedule(self) -> str:
        """e.g., 'hourly', 'daily', 'weekly'"""
        ...

    @abstractmethod
    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """
        Scan and return raw insights for a specific tenant.
        """
        pass

    def _get_localized_text(self, mapping: Dict[str, str], locale: str, default_val: str = "") -> str:
        """Helper to get text by locale with fallback."""
        return mapping.get(locale, mapping.get("tr", default_val))

class AnalyzerRegistry:
    """
    Registry to manage all 60 analyzers.
    """
    def __init__(self, db: Session):
        self.db = db
        self._analyzers: List[BaseAnalyzer] = []
        self._load_analyzers()

    def _load_analyzers(self):
        # This will be populated as we implement the 60 insights
        from ai.insights.operations import (
            StaffWorkloadAnalyzer,
            CriticalStockAnalyzer,
            InventoryTurnoverAnalyzer,
            CancellationRateAnalyzer,
            LeadConversionAnalyzer,
            LeadStagnationAnalyzer,
            MissingDocumentAnalyzer,
            StockInconsistencyAnalyzer,
            ClinicianUtilizationAnalyzer,
            SupplierLeadTimeAnalyzer
        )
        from ai.insights.patient_care import (
            NoShowRiskAnalyzer,
            WarrantyExpiringAnalyzer,
            TrialPeriodEndingAnalyzer,
            HearingTestOverdueAnalyzer,
            PatientDisengagementAnalyzer,
            SGKEligibilityExpiringAnalyzer,
            BatteryReplacementAnalyzer,
            DeviceMaintenanceAnalyzer,
            BirthdayEngagementAnalyzer,
            BilateralUpgradeAnalyzer,
            AccessoryCrossSellAnalyzer,
            DeviceUpgradeAnalyzer,
            ReferralOpportunityAnalyzer,
            PostFittingFollowUpAnalyzer,
            SeasonalCampaignAnalyzer
        )
        from ai.insights.growth import (
            LeadEngagementAnalyzer,
            CampaignRoIAnalyzer,
            LTVSegmentationAnalyzer
        )
        from ai.insights.financial import (
            OverduePaymentAnalyzer,
            RevenueLeakageAnalyzer,
            HighDebtAnalyzer,
            UpcomingPaymentAnalyzer,
            SGKRejectionRiskAnalyzer,
            RefundPatternAnalyzer,
            DiscountThresholdAnalyzer,
            InstallmentSkipAnalyzer
        )
        from ai.insights.risk_system import (
            DataQualityAnalyzer,
            RegulatoryComplianceAnalyzer,
            StorageCapacityAnalyzer,
            SystemHealthAnalyzer
        )
        self._analyzers = [
            # Risk & System (Category E & F)
            DataQualityAnalyzer(self.db),
            RegulatoryComplianceAnalyzer(self.db),
            StorageCapacityAnalyzer(self.db),
            SystemHealthAnalyzer(self.db),
            
            # Growth (Category D)
            LeadEngagementAnalyzer(self.db),
            CampaignRoIAnalyzer(self.db),
            LTVSegmentationAnalyzer(self.db),
            
            # Financial (Category C)
            OverduePaymentAnalyzer(self.db),
            RevenueLeakageAnalyzer(self.db),
            HighDebtAnalyzer(self.db),
            UpcomingPaymentAnalyzer(self.db),
            SGKRejectionRiskAnalyzer(self.db),
            RefundPatternAnalyzer(self.db),
            DiscountThresholdAnalyzer(self.db),
            InstallmentSkipAnalyzer(self.db),
            
            # Operations (Category B)
            StaffWorkloadAnalyzer(self.db),
            CriticalStockAnalyzer(self.db),
            InventoryTurnoverAnalyzer(self.db),
            CancellationRateAnalyzer(self.db),
            LeadConversionAnalyzer(self.db),
            LeadStagnationAnalyzer(self.db),
            MissingDocumentAnalyzer(self.db),
            StockInconsistencyAnalyzer(self.db),
            ClinicianUtilizationAnalyzer(self.db),
            SupplierLeadTimeAnalyzer(self.db),
            
            # Patient Care (Category A)
            NoShowRiskAnalyzer(self.db),
            WarrantyExpiringAnalyzer(self.db),
            TrialPeriodEndingAnalyzer(self.db),
            HearingTestOverdueAnalyzer(self.db),
            PatientDisengagementAnalyzer(self.db),
            SGKEligibilityExpiringAnalyzer(self.db),
            BatteryReplacementAnalyzer(self.db),
            DeviceMaintenanceAnalyzer(self.db),
            BirthdayEngagementAnalyzer(self.db),
            BilateralUpgradeAnalyzer(self.db),
            AccessoryCrossSellAnalyzer(self.db),
            DeviceUpgradeAnalyzer(self.db),
            ReferralOpportunityAnalyzer(self.db),
            PostFittingFollowUpAnalyzer(self.db),
            SeasonalCampaignAnalyzer(self.db),
        ]

    def get_analyzers(self, schedule: Optional[str] = None) -> List[BaseAnalyzer]:
        if schedule:
            return [a for a in self._analyzers if a.schedule == schedule]
        return self._analyzers
