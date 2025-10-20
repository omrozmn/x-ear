import React, { useState, useEffect, useMemo } from 'react'
import { Users, UserCheck, UserX, TrendingUp, TrendingDown, Minus, Calendar, Clock, AlertCircle, Activity } from 'lucide-react'

interface PatientStatsProps {
  totalPatients?: number
  activePatients?: number
  inactivePatients?: number
  newPatientsThisMonth?: number
  todayAppointments?: number
  pendingTasks?: number
  deviceTrialsActive?: number
  sgkReportsPending?: number
  loading?: boolean
  className?: string
  showTrends?: boolean
  showExtendedStats?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onRefresh?: () => Promise<void>
}

interface StatItem {
  id: string
  name: string
  value: number
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    period: string
  }
  target?: number
  priority?: 'high' | 'medium' | 'low'
}

export const PatientStats: React.FC<PatientStatsProps> = ({
  totalPatients = 0,
  activePatients = 0,
  inactivePatients = 0,
  newPatientsThisMonth = 0,
  todayAppointments = 0,
  pendingTasks = 0,
  deviceTrialsActive = 0,
  sgkReportsPending = 0,
  loading = false,
  className = "",
  showTrends = true,
  showExtendedStats = false,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  onRefresh
}) => {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return

    const interval = setInterval(async () => {
      setIsRefreshing(true)
      try {
        await onRefresh()
        setLastUpdated(new Date())
      } catch (error) {
        console.error('Failed to refresh patient stats:', error)
      } finally {
        setIsRefreshing(false)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, onRefresh, refreshInterval])

  // Calculate trends (mock data - in real app this would come from props)
  const calculateTrend = (current: number, previous: number): StatItem['trend'] => {
    if (previous === 0) return { value: 0, direction: 'neutral', period: 'geçen aya göre' }
    
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      period: 'geçen aya göre'
    }
  }

  const stats: StatItem[] = useMemo(() => {
    const baseStats: StatItem[] = [
      {
        id: 'total',
        name: 'Toplam Hasta',
        value: totalPatients,
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        trend: showTrends ? calculateTrend(totalPatients, totalPatients * 0.95) : undefined
      },
      {
        id: 'active',
        name: 'Aktif Hastalar',
        value: activePatients,
        icon: UserCheck,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        trend: showTrends ? calculateTrend(activePatients, activePatients * 0.92) : undefined
      },
      {
        id: 'inactive',
        name: 'Pasif Hastalar',
        value: inactivePatients,
        icon: UserX,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        trend: showTrends ? calculateTrend(inactivePatients, inactivePatients * 1.1) : undefined,
        priority: inactivePatients > totalPatients * 0.3 ? 'high' : 'low'
      },
      {
        id: 'new',
        name: 'Bu Ay Yeni',
        value: newPatientsThisMonth,
        icon: TrendingUp,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        trend: showTrends ? calculateTrend(newPatientsThisMonth, Math.floor(newPatientsThisMonth * 0.8)) : undefined,
        target: 50 // Example target
      }
    ]

    if (showExtendedStats) {
      baseStats.push(
        {
          id: 'appointments',
          name: 'Bugün Randevu',
          value: todayAppointments,
          icon: Calendar,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          priority: todayAppointments > 20 ? 'high' : 'medium'
        },
        {
          id: 'pending',
          name: 'Bekleyen Görevler',
          value: pendingTasks,
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          priority: pendingTasks > 10 ? 'high' : 'low'
        },
        {
          id: 'trials',
          name: 'Aktif Denemeler',
          value: deviceTrialsActive,
          icon: Activity,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-100'
        },
        {
          id: 'sgk',
          name: 'SGK Bekleyen',
          value: sgkReportsPending,
          icon: AlertCircle,
          color: 'text-pink-600',
          bgColor: 'bg-pink-100',
          priority: sgkReportsPending > 5 ? 'high' : 'low'
        }
      )
    }

    return baseStats
  }, [
    totalPatients,
    activePatients,
    inactivePatients,
    newPatientsThisMonth,
    todayAppointments,
    pendingTasks,
    deviceTrialsActive,
    sgkReportsPending,
    showTrends,
    showExtendedStats
  ])

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />
      case 'down':
        return <TrendingDown className="w-3 h-3" />
      default:
        return <Minus className="w-3 h-3" />
    }
  }

  const getTrendColor = (direction: 'up' | 'down' | 'neutral', isPositive: boolean = true) => {
    if (direction === 'neutral') return 'text-gray-500'
    
    const isGoodTrend = (direction === 'up' && isPositive) || (direction === 'down' && !isPositive)
    return isGoodTrend ? 'text-green-600' : 'text-red-600'
  }

  const getPriorityIndicator = (priority?: 'high' | 'medium' | 'low') => {
    if (!priority || priority === 'low') return null
    
    return (
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
        priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
      }`} />
    )
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(showExtendedStats ? 8 : 4)].map((_, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header with refresh info */}
      {autoRefresh && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500">
            Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
          </div>
          {isRefreshing && (
            <div className="flex items-center text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Güncelleniyor...
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${showExtendedStats ? '4' : '4'} gap-4`}>
        {stats.map((stat) => {
          const Icon = stat.icon
          const isNegativeTrend = stat.id === 'inactive' // Inactive patients going up is bad
          
          return (
            <div 
              key={stat.id} 
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-all duration-200 relative"
            >
              {getPriorityIndicator(stat.priority)}
              
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-lg font-semibold text-gray-900">
                          {stat.value.toLocaleString('tr-TR')}
                        </div>
                        {stat.target && (
                          <div className="ml-2 text-xs text-gray-500">
                            / {stat.target}
                          </div>
                        )}
                      </dd>
                    </dl>
                    
                    {/* Trend Indicator */}
                    {stat.trend && (
                      <div className={`flex items-center mt-1 text-xs ${getTrendColor(stat.trend.direction, !isNegativeTrend)}`}>
                        {getTrendIcon(stat.trend.direction)}
                        <span className="ml-1">
                          {stat.trend.value.toFixed(1)}% {stat.trend.period}
                        </span>
                      </div>
                    )}
                    
                    {/* Progress Bar for targets */}
                    {stat.target && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full ${stat.color.replace('text-', 'bg-')}`}
                            style={{ width: `${Math.min((stat.value / stat.target) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}