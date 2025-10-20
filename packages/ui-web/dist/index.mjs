// src/components/layout/Header.tsx
import { useState } from "react";
import { Bell, Search, Settings, User, Moon, Sun, Menu } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
var Header = ({
  title = "X-Ear Y\xF6netim Sistemi",
  user = { name: "Kullan\u0131c\u0131", email: "user@example.com" },
  onMenuToggle,
  onNotificationClick,
  onProfileClick,
  onSettingsClick,
  className = ""
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    onNotificationClick?.();
  };
  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
    onProfileClick?.();
  };
  const notifications = [
    { id: 1, title: "Yeni hasta kayd\u0131", message: "Ahmet Y\u0131lmaz kaydedildi", time: "5 dk \xF6nce", unread: true },
    { id: 2, title: "Randevu hat\u0131rlatmas\u0131", message: "14:00 randevusu yakla\u015F\u0131yor", time: "10 dk \xF6nce", unread: true },
    { id: 3, title: "Stok uyar\u0131s\u0131", message: "Pil stoku azal\u0131yor", time: "1 saat \xF6nce", unread: false }
  ];
  return /* @__PURE__ */ jsx("header", { className: `bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 ${className}`, children: /* @__PURE__ */ jsx("div", { className: "px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center h-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onMenuToggle,
          className: "p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden",
          children: /* @__PURE__ */ jsx(Menu, { className: "h-6 w-6" })
        }
      ),
      /* @__PURE__ */ jsx("h1", { className: "ml-4 text-xl font-semibold text-gray-900 dark:text-white", children: title })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-4", children: [
      /* @__PURE__ */ jsx("div", { className: "hidden md:block", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsx(Search, { className: "h-5 w-5 text-gray-400" }) }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "Ara...",
            className: "block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: toggleDarkMode,
          className: "p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
          children: isDarkMode ? /* @__PURE__ */ jsx(Sun, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Moon, { className: "h-5 w-5" })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleNotificationClick,
            className: "p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 relative",
            children: [
              /* @__PURE__ */ jsx(Bell, { className: "h-5 w-5" }),
              notifications.some((n) => n.unread) && /* @__PURE__ */ jsx("span", { className: "absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800" })
            ]
          }
        ),
        showNotifications && /* @__PURE__ */ jsx("div", { className: "absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50", children: /* @__PURE__ */ jsxs("div", { className: "p-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-white mb-3", children: "Bildirimler" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-3", children: notifications.map((notification) => /* @__PURE__ */ jsx(
            "div",
            {
              className: `p-3 rounded-lg ${notification.unread ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-700"}`,
              children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: notification.title }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600 dark:text-gray-300 mt-1", children: notification.message })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500 dark:text-gray-400 ml-2", children: notification.time })
              ] })
            },
            notification.id
          )) }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 pt-3 border-t border-gray-200 dark:border-gray-600", children: /* @__PURE__ */ jsx("button", { className: "text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500", children: "T\xFCm\xFCn\xFC g\xF6r" }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onSettingsClick,
          className: "p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
          children: /* @__PURE__ */ jsx(Settings, { className: "h-5 w-5" })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleProfileClick,
            className: "flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            children: [
              /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center", children: user.avatar ? /* @__PURE__ */ jsx("img", { className: "h-8 w-8 rounded-full", src: user.avatar, alt: user.name }) : /* @__PURE__ */ jsx(User, { className: "h-5 w-5 text-white" }) }),
              /* @__PURE__ */ jsx("span", { className: "ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block", children: user.name })
            ]
          }
        ),
        showProfileDropdown && /* @__PURE__ */ jsx("div", { className: "absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50", children: /* @__PURE__ */ jsxs("div", { className: "py-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-gray-200 dark:border-gray-600", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white", children: user.name }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: user.email })
          ] }),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "#",
              className: "block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              children: "Profil"
            }
          ),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "#",
              className: "block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              children: "Ayarlar"
            }
          ),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "#",
              className: "block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              children: "\xC7\u0131k\u0131\u015F Yap"
            }
          )
        ] }) })
      ] })
    ] })
  ] }) }) });
};
var Header_default = Header;

// src/components/layout/Sidebar.tsx
import { useState as useState2, useEffect } from "react";
import {
  Home,
  Users,
  Calendar,
  Package,
  Truck,
  DollarSign,
  Megaphone,
  Settings as Settings2,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  X
} from "lucide-react";
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: /* @__PURE__ */ jsx2(Home, { className: "w-5 h-5" }),
    href: "/dashboard"
  },
  {
    id: "patients",
    label: "Hastalar",
    icon: /* @__PURE__ */ jsx2(Users, { className: "w-5 h-5" }),
    href: "/patients",
    badge: "12"
  },
  {
    id: "appointments",
    label: "Randevular",
    icon: /* @__PURE__ */ jsx2(Calendar, { className: "w-5 h-5" }),
    href: "/appointments"
  },
  {
    id: "inventory",
    label: "Envanter",
    icon: /* @__PURE__ */ jsx2(Package, { className: "w-5 h-5" }),
    href: "/inventory"
  },
  {
    id: "suppliers",
    label: "Tedarik\xE7iler",
    icon: /* @__PURE__ */ jsx2(Truck, { className: "w-5 h-5" }),
    href: "/suppliers"
  },
  {
    id: "cashflow",
    label: "Nakit Ak\u0131\u015F\u0131",
    icon: /* @__PURE__ */ jsx2(DollarSign, { className: "w-5 h-5" }),
    href: "/cashflow"
  },
  {
    id: "campaigns",
    label: "Kampanyalar",
    icon: /* @__PURE__ */ jsx2(Megaphone, { className: "w-5 h-5" }),
    href: "/campaigns"
  },
  {
    id: "invoices",
    label: "Faturalar",
    icon: /* @__PURE__ */ jsx2(FileText, { className: "w-5 h-5" }),
    children: [
      {
        id: "new-invoice",
        label: "Yeni Fatura",
        icon: /* @__PURE__ */ jsx2(FileText, { className: "w-4 h-4" }),
        href: "/invoices/new"
      },
      {
        id: "invoice-list",
        label: "Fatura Listesi",
        icon: /* @__PURE__ */ jsx2(FileText, { className: "w-4 h-4" }),
        href: "/invoices"
      }
    ]
  },
  {
    id: "sgk-reports",
    label: "SGK Raporlar\u0131",
    icon: /* @__PURE__ */ jsx2(Activity, { className: "w-5 h-5" }),
    children: [
      {
        id: "sgk-upload",
        label: "SGK Y\xFCkleme",
        icon: /* @__PURE__ */ jsx2(Activity, { className: "w-4 h-4" }),
        href: "/sgk/upload"
      },
      {
        id: "sgk-reports-list",
        label: "Rapor Listesi",
        icon: /* @__PURE__ */ jsx2(Activity, { className: "w-4 h-4" }),
        href: "/sgk/reports"
      }
    ]
  },
  {
    id: "reports",
    label: "Raporlar",
    icon: /* @__PURE__ */ jsx2(FileText, { className: "w-5 h-5" }),
    children: [
      {
        id: "financial-reports",
        label: "Mali Raporlar",
        icon: /* @__PURE__ */ jsx2(FileText, { className: "w-4 h-4" }),
        href: "/reports/financial"
      },
      {
        id: "patient-reports",
        label: "Hasta Raporlar\u0131",
        icon: /* @__PURE__ */ jsx2(FileText, { className: "w-4 h-4" }),
        href: "/reports/patients"
      }
    ]
  },
  {
    id: "settings",
    label: "Ayarlar",
    icon: /* @__PURE__ */ jsx2(Settings2, { className: "w-5 h-5" }),
    href: "/settings"
  }
];
var Sidebar = ({
  isOpen = true,
  onClose,
  currentPath = "/dashboard",
  className = ""
}) => {
  const [collapsed, setCollapsed] = useState2(false);
  const [expandedItems, setExpandedItems] = useState2(/* @__PURE__ */ new Set());
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) {
      setCollapsed(JSON.parse(savedCollapsed));
    }
    const savedExpanded = localStorage.getItem("sidebar-expanded");
    if (savedExpanded) {
      setExpandedItems(new Set(JSON.parse(savedExpanded)));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem("sidebar-expanded", JSON.stringify([...expandedItems]));
  }, [expandedItems]);
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };
  const isActive = (href) => {
    if (!href)
      return false;
    return currentPath === href || currentPath.startsWith(href + "/");
  };
  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.href);
    return /* @__PURE__ */ jsxs2("div", { children: [
      /* @__PURE__ */ jsxs2(
        "div",
        {
          className: `
            flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors
            ${level > 0 ? "ml-6" : ""}
            ${active ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}
          `,
          onClick: () => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.href) {
              window.location.href = item.href;
            }
          },
          children: [
            /* @__PURE__ */ jsxs2("div", { className: "flex items-center flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx2("div", { className: "flex-shrink-0", children: item.icon }),
              !collapsed && /* @__PURE__ */ jsxs2(Fragment, { children: [
                /* @__PURE__ */ jsx2("span", { className: "ml-3 truncate", children: item.label }),
                item.badge && /* @__PURE__ */ jsx2("span", { className: "ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", children: item.badge })
              ] })
            ] }),
            hasChildren && !collapsed && /* @__PURE__ */ jsx2("div", { className: "flex-shrink-0 ml-2", children: isExpanded ? /* @__PURE__ */ jsx2(ChevronDown, { className: "w-4 h-4" }) : /* @__PURE__ */ jsx2(ChevronRight, { className: "w-4 h-4" }) })
          ]
        }
      ),
      hasChildren && isExpanded && !collapsed && /* @__PURE__ */ jsx2("div", { className: "mt-1 space-y-1", children: item.children?.map((child) => renderMenuItem(child, level + 1)) })
    ] }, item.id);
  };
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    isOpen && /* @__PURE__ */ jsx2(
      "div",
      {
        className: "fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxs2(
      "div",
      {
        className: `
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-64"}
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:inset-0
          ${className}
        `,
        children: [
          /* @__PURE__ */ jsxs2("div", { className: "flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700", children: [
            !collapsed && /* @__PURE__ */ jsxs2("div", { className: "flex items-center", children: [
              /* @__PURE__ */ jsx2("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsx2("div", { className: "w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsx2("span", { className: "text-white font-bold text-lg", children: "X" }) }) }),
              /* @__PURE__ */ jsx2("span", { className: "ml-2 text-xl font-semibold text-gray-900 dark:text-white", children: "X-Ear" })
            ] }),
            /* @__PURE__ */ jsx2(
              "button",
              {
                onClick: onClose,
                className: "p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden",
                children: /* @__PURE__ */ jsx2(X, { className: "w-5 h-5" })
              }
            ),
            /* @__PURE__ */ jsx2(
              "button",
              {
                onClick: toggleCollapsed,
                className: "hidden lg:block p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700",
                children: /* @__PURE__ */ jsx2(ChevronRight, { className: `w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}` })
              }
            )
          ] }),
          /* @__PURE__ */ jsx2("nav", { className: "flex-1 px-3 py-4 space-y-1 overflow-y-auto", children: menuItems.map((item) => renderMenuItem(item)) }),
          !collapsed && /* @__PURE__ */ jsx2("div", { className: "p-4 border-t border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsx2("div", { className: "text-xs text-gray-500 dark:text-gray-400 text-center", children: "X-Ear v1.0.0" }) })
        ]
      }
    )
  ] });
};
var Sidebar_default = Sidebar;

// src/components/layout/Layout.tsx
import { useState as useState3, useEffect as useEffect2 } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var Layout = ({
  children,
  title,
  user,
  currentPath,
  className = ""
}) => {
  const [sidebarOpen, setSidebarOpen] = useState3(false);
  const [isMobile, setIsMobile] = useState3(false);
  useEffect2(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect2(() => {
    if (sidebarOpen && isMobile) {
      const handleClickOutside = (event) => {
        const sidebar = document.getElementById("sidebar");
        const target = event.target;
        if (sidebar && !sidebar.contains(target)) {
          setSidebarOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [sidebarOpen, isMobile]);
  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };
  const handleNotificationClick = () => {
    console.log("Notification clicked");
  };
  const handleProfileClick = () => {
    console.log("Profile clicked");
  };
  const handleSettingsClick = () => {
    console.log("Settings clicked");
  };
  return /* @__PURE__ */ jsxs3("div", { className: `min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`, children: [
    /* @__PURE__ */ jsx3("div", { id: "sidebar", children: /* @__PURE__ */ jsx3(
      Sidebar_default,
      {
        isOpen: sidebarOpen,
        onClose: handleSidebarClose,
        currentPath
      }
    ) }),
    /* @__PURE__ */ jsxs3("div", { className: "lg:pl-64", children: [
      /* @__PURE__ */ jsx3(
        Header_default,
        {
          title,
          user,
          onMenuToggle: handleMenuToggle,
          onNotificationClick: handleNotificationClick,
          onProfileClick: handleProfileClick,
          onSettingsClick: handleSettingsClick
        }
      ),
      /* @__PURE__ */ jsx3("main", { className: "py-6", children: /* @__PURE__ */ jsx3("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children }) })
    ] })
  ] });
};
var Layout_default = Layout;

// src/components/ui/Modal.tsx
import { useEffect as useEffect3, useRef, useState as useState4 } from "react";
import { X as X2 } from "lucide-react";
import { createPortal } from "react-dom";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-full mx-4"
};
var Modal = ({
  isOpen,
  onClose,
  onSave,
  title,
  size = "md",
  closable = true,
  backdrop = true,
  showFooter = true,
  saveButtonText = "Kaydet",
  cancelButtonText = "\u0130ptal",
  customFooter,
  children,
  className = ""
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  useEffect3(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && closable) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 100);
    }
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      if (isOpen) {
        document.body.style.overflow = "";
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      }
    };
  }, [isOpen, closable, onClose]);
  const handleKeyDown = (event) => {
    if (event.key === "Tab") {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && backdrop && closable) {
      onClose();
    }
  };
  const handleSave = () => {
    if (onSave) {
      const result = onSave();
      if (result !== false) {
        onClose();
      }
    }
  };
  if (!isOpen)
    return null;
  const modalContent = /* @__PURE__ */ jsx4(
    "div",
    {
      className: "fixed inset-0 z-50 overflow-y-auto",
      "aria-labelledby": "modal-title",
      role: "dialog",
      "aria-modal": "true",
      children: /* @__PURE__ */ jsxs4(
        "div",
        {
          className: "flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0",
          onClick: handleBackdropClick,
          children: [
            /* @__PURE__ */ jsx4(
              "div",
              {
                className: "fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity",
                "aria-hidden": "true"
              }
            ),
            /* @__PURE__ */ jsx4("span", { className: "hidden sm:inline-block sm:align-middle sm:h-screen", "aria-hidden": "true", children: "\u200B" }),
            /* @__PURE__ */ jsxs4(
              "div",
              {
                ref: modalRef,
                className: `
            inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full
            ${sizeClasses[size]}
            ${className}
          `,
                onKeyDown: handleKeyDown,
                children: [
                  (title || closable) && /* @__PURE__ */ jsxs4("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700", children: [
                    title && /* @__PURE__ */ jsx4(
                      "h3",
                      {
                        id: "modal-title",
                        className: "text-lg font-semibold text-gray-900 dark:text-white",
                        children: title
                      }
                    ),
                    closable && /* @__PURE__ */ jsx4(
                      "button",
                      {
                        onClick: onClose,
                        className: "p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors",
                        children: /* @__PURE__ */ jsx4(X2, { className: "w-5 h-5" })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx4("div", { className: "px-6 py-4", children }),
                  showFooter && /* @__PURE__ */ jsx4("div", { className: "px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600", children: customFooter || /* @__PURE__ */ jsxs4("div", { className: "flex justify-end space-x-3", children: [
                    /* @__PURE__ */ jsx4(
                      "button",
                      {
                        type: "button",
                        onClick: onClose,
                        className: "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors",
                        children: cancelButtonText
                      }
                    ),
                    onSave && /* @__PURE__ */ jsx4(
                      "button",
                      {
                        type: "button",
                        onClick: handleSave,
                        className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors",
                        children: saveButtonText
                      }
                    )
                  ] }) })
                ]
              }
            )
          ]
        }
      )
    }
  );
  return createPortal(modalContent, document.body);
};
var useModal = () => {
  const [isOpen, setIsOpen] = useState4(false);
  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  return {
    isOpen,
    openModal,
    closeModal
  };
};

// src/components/ui/StatsCard.tsx
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var colorClasses = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/20",
    icon: "text-blue-600 dark:text-blue-400"
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/20",
    icon: "text-green-600 dark:text-green-400"
  },
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/20",
    icon: "text-yellow-600 dark:text-yellow-400"
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/20",
    icon: "text-red-600 dark:text-red-400"
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/20",
    icon: "text-purple-600 dark:text-purple-400"
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-700",
    icon: "text-gray-600 dark:text-gray-400"
  }
};
var StatsCard = ({
  title,
  value,
  icon,
  color = "blue",
  trend,
  subtitle,
  clickable = false,
  onClick,
  loading = false,
  className = ""
}) => {
  const colorClass = colorClasses[color];
  const clickableClass = clickable ? "cursor-pointer hover:shadow-lg transition-shadow duration-200" : "";
  const renderTrend = () => {
    if (!trend)
      return null;
    const trendColor = trend.direction === "up" ? "text-green-600 dark:text-green-400" : trend.direction === "down" ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400";
    const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
    return /* @__PURE__ */ jsxs5("div", { className: "flex items-center mt-2", children: [
      /* @__PURE__ */ jsxs5("span", { className: `text-sm ${trendColor} flex items-center`, children: [
        /* @__PURE__ */ jsx5(TrendIcon, { className: "w-4 h-4 mr-1" }),
        /* @__PURE__ */ jsx5("span", { children: trend.value })
      ] }),
      trend.period && /* @__PURE__ */ jsx5("span", { className: "text-sm text-gray-500 dark:text-gray-400 ml-2", children: trend.period })
    ] });
  };
  const renderLoading = () => /* @__PURE__ */ jsx5("div", { className: "animate-pulse", children: /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ jsxs5("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsx5("div", { className: "h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2" }),
      /* @__PURE__ */ jsx5("div", { className: "h-8 bg-gray-200 dark:bg-gray-600 rounded w-16 mb-2" }),
      /* @__PURE__ */ jsx5("div", { className: "h-3 bg-gray-200 dark:bg-gray-600 rounded w-20" })
    ] }),
    /* @__PURE__ */ jsx5("div", { className: "w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg ml-4" })
  ] }) });
  const renderContent = () => /* @__PURE__ */ jsxs5("div", { className: "flex items-center justify-between", children: [
    /* @__PURE__ */ jsxs5("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsx5("p", { className: "text-sm font-medium text-gray-600 dark:text-gray-400", children: title }),
      /* @__PURE__ */ jsx5("p", { className: "text-3xl font-bold text-gray-900 dark:text-white mt-1", children: value }),
      subtitle && /* @__PURE__ */ jsx5("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1", children: subtitle }),
      renderTrend()
    ] }),
    icon && /* @__PURE__ */ jsx5("div", { className: `p-3 ${colorClass.bg} rounded-lg ml-4`, children: /* @__PURE__ */ jsx5("div", { className: colorClass.icon, children: icon }) })
  ] });
  return /* @__PURE__ */ jsx5(
    "div",
    {
      className: `
        bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
        ${clickableClass}
        ${className}
      `,
      onClick: clickable ? onClick : void 0,
      role: clickable ? "button" : void 0,
      tabIndex: clickable ? 0 : void 0,
      onKeyDown: clickable ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : void 0,
      children: loading ? renderLoading() : renderContent()
    }
  );
};
var createPatientStats = () => [
  {
    title: "Toplam Hasta",
    value: "0",
    color: "blue",
    icon: /* @__PURE__ */ jsx5("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx5("path", { d: "M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" }) })
  },
  {
    title: "Aktif Hasta",
    value: "0",
    color: "green",
    icon: /* @__PURE__ */ jsx5("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx5("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) })
  },
  {
    title: "Bekleyen",
    value: "0",
    color: "yellow",
    icon: /* @__PURE__ */ jsx5("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx5("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z", clipRule: "evenodd" }) })
  },
  {
    title: "Bu Ay Yeni",
    value: "0",
    color: "purple",
    icon: /* @__PURE__ */ jsx5("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx5("path", { fillRule: "evenodd", d: "M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z", clipRule: "evenodd" }) })
  }
];
var createInventoryStats = () => [
  {
    title: "Toplam \xDCr\xFCn",
    value: "0",
    color: "blue",
    icon: /* @__PURE__ */ jsx5("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx5("path", { fillRule: "evenodd", d: "M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM6 9a1 1 0 112 0 1 1 0 01-2 0zm6 0a1 1 0 112 0 1 1 0 01-2 0z", clipRule: "evenodd" }) })
  },
  {
    title: "D\xFC\u015F\xFCk Stok",
    value: "0",
    color: "red",
    icon: /* @__PURE__ */ jsx5("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx5("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) })
  },
  {
    title: "Toplam De\u011Fer",
    value: "\u20BA0",
    color: "green",
    icon: /* @__PURE__ */ jsxs5("svg", { className: "w-6 h-6", fill: "currentColor", viewBox: "0 0 20 20", children: [
      /* @__PURE__ */ jsx5("path", { d: "M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" }),
      /* @__PURE__ */ jsx5("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5a1 1 0 10-2 0v.092z", clipRule: "evenodd" })
    ] })
  }
];

// src/components/ui/DataTable.tsx
import { useState as useState5, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown as ChevronDown2, ChevronLeft, ChevronRight as ChevronRight2, Search as Search2 } from "lucide-react";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var DataTable = ({
  data,
  columns,
  loading = false,
  pagination,
  rowSelection,
  actions,
  bulkActions,
  searchable = false,
  onSearch,
  sortable = false,
  onSort,
  rowKey = "id",
  emptyText = "Veri bulunamad\u0131",
  size = "medium",
  bordered = false,
  striped = false,
  hoverable = true,
  className = ""
}) => {
  const [searchValue, setSearchValue] = useState5("");
  const [sortConfig, setSortConfig] = useState5(null);
  const [showBulkActions, setShowBulkActions] = useState5(false);
  const getRowKey = useCallback((record, index) => {
    if (typeof rowKey === "function") {
      return rowKey(record);
    }
    return record[rowKey] || index;
  }, [rowKey]);
  const selectedRecords = useMemo(() => {
    if (!rowSelection)
      return [];
    return data.filter(
      (record) => rowSelection.selectedRowKeys.includes(getRowKey(record, data.indexOf(record)))
    );
  }, [data, rowSelection, getRowKey]);
  const handleSort = (key) => {
    if (!sortable)
      return;
    let direction = "asc";
    if (sortConfig?.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : sortConfig.direction === "desc" ? null : "asc";
    }
    setSortConfig(direction ? { key, direction } : null);
    onSort?.(key, direction);
  };
  const handleSearch = (value) => {
    setSearchValue(value);
    onSearch?.(value);
  };
  const handleSelectAll = (checked) => {
    if (!rowSelection)
      return;
    if (checked) {
      const allKeys = data.map((record, index) => getRowKey(record, index));
      rowSelection.onChange(allKeys, data);
    } else {
      rowSelection.onChange([], []);
    }
  };
  const handleSelectRow = (record, checked) => {
    if (!rowSelection)
      return;
    const key = getRowKey(record, data.indexOf(record));
    let newSelectedKeys = [...rowSelection.selectedRowKeys];
    if (checked) {
      newSelectedKeys.push(key);
    } else {
      newSelectedKeys = newSelectedKeys.filter((k) => k !== key);
    }
    const newSelectedRows = data.filter(
      (r) => newSelectedKeys.includes(getRowKey(r, data.indexOf(r)))
    );
    rowSelection.onChange(newSelectedKeys, newSelectedRows);
  };
  const sizeClasses5 = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg"
  };
  const cellPadding = {
    small: "px-3 py-2",
    medium: "px-4 py-3",
    large: "px-6 py-4"
  };
  const isAllSelected = rowSelection && data.length > 0 && data.every((record) => rowSelection.selectedRowKeys.includes(getRowKey(record, data.indexOf(record))));
  const isIndeterminate = rowSelection && rowSelection.selectedRowKeys.length > 0 && !isAllSelected;
  const renderCell = (column, record, index) => {
    const value = record[column.key];
    if (column.render) {
      return column.render(value, record, index);
    }
    return value;
  };
  const renderActions = (record) => {
    if (!actions || actions.length === 0)
      return null;
    return /* @__PURE__ */ jsx6("div", { className: "flex items-center space-x-2", children: actions.map((action) => /* @__PURE__ */ jsxs6(
      "button",
      {
        onClick: () => action.onClick(record),
        disabled: action.disabled?.(record),
        className: `
              inline-flex items-center px-2 py-1 text-sm font-medium rounded-md
              ${action.variant === "danger" ? "text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30" : action.variant === "primary" ? "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30" : "text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"}
              disabled:opacity-50 disabled:cursor-not-allowed
            `,
        children: [
          action.icon && /* @__PURE__ */ jsx6("span", { className: "mr-1", children: action.icon }),
          action.label
        ]
      },
      action.key
    )) });
  };
  const renderPagination = () => {
    if (!pagination)
      return null;
    const { current, pageSize, total, showSizeChanger, pageSizeOptions = [10, 20, 50, 100] } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (current - 1) * pageSize + 1;
    const endItem = Math.min(current * pageSize, total);
    const getVisiblePages = () => {
      const maxVisible = 5;
      const pages = [];
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        const start = Math.max(1, current - Math.floor(maxVisible / 2));
        const end = Math.min(totalPages, start + maxVisible - 1);
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        if (start > 1) {
          pages.unshift(-1);
          pages.unshift(1);
        }
        if (end < totalPages) {
          pages.push(-2);
          pages.push(totalPages);
        }
      }
      return pages;
    };
    const visiblePages = getVisiblePages();
    return /* @__PURE__ */ jsxs6("div", { className: "flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700", children: [
      /* @__PURE__ */ jsxs6("div", { className: "flex items-center text-sm text-gray-700 dark:text-gray-300", children: [
        /* @__PURE__ */ jsxs6("span", { children: [
          total > 0 ? `${startItem}-${endItem}` : "0",
          " / ",
          total,
          " kay\u0131t g\xF6steriliyor"
        ] }),
        showSizeChanger && /* @__PURE__ */ jsx6(
          "select",
          {
            value: pageSize,
            onChange: (e) => pagination.onChange(1, Number(e.target.value)),
            className: "ml-4 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            children: pageSizeOptions.map((size2) => /* @__PURE__ */ jsxs6("option", { value: size2, children: [
              size2,
              " / sayfa"
            ] }, size2))
          }
        )
      ] }),
      /* @__PURE__ */ jsxs6("div", { className: "flex items-center space-x-1", children: [
        /* @__PURE__ */ jsx6(
          "button",
          {
            onClick: () => pagination.onChange(1, pageSize),
            disabled: current <= 1,
            className: "px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed",
            title: "\u0130lk sayfa",
            children: "\u0130lk"
          }
        ),
        /* @__PURE__ */ jsx6(
          "button",
          {
            onClick: () => pagination.onChange(current - 1, pageSize),
            disabled: current <= 1,
            className: "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed",
            title: "\xD6nceki sayfa",
            children: /* @__PURE__ */ jsx6(ChevronLeft, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsx6("div", { className: "flex items-center space-x-1", children: visiblePages.map((page, index) => {
          if (page === -1 || page === -2) {
            return /* @__PURE__ */ jsx6("span", { className: "px-2 py-1 text-gray-400", children: "..." }, `ellipsis-${index}`);
          }
          return /* @__PURE__ */ jsx6(
            "button",
            {
              onClick: () => pagination.onChange(page, pageSize),
              className: `
                    px-3 py-1 text-sm rounded-md transition-colors
                    ${page === current ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}
                  `,
              children: page
            },
            page
          );
        }) }),
        /* @__PURE__ */ jsx6(
          "button",
          {
            onClick: () => pagination.onChange(current + 1, pageSize),
            disabled: current >= totalPages,
            className: "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed",
            title: "Sonraki sayfa",
            children: /* @__PURE__ */ jsx6(ChevronRight2, { className: "w-4 h-4" })
          }
        ),
        /* @__PURE__ */ jsx6(
          "button",
          {
            onClick: () => pagination.onChange(totalPages, pageSize),
            disabled: current >= totalPages,
            className: "px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed",
            title: "Son sayfa",
            children: "Son"
          }
        )
      ] })
    ] });
  };
  return /* @__PURE__ */ jsxs6("div", { className: `bg-white dark:bg-gray-800 shadow-sm rounded-lg ${className}`, children: [
    /* @__PURE__ */ jsx6("div", { className: "px-4 py-3 border-b border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsx6("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsxs6("div", { className: "flex items-center space-x-4", children: [
      searchable && /* @__PURE__ */ jsxs6("div", { className: "relative", children: [
        /* @__PURE__ */ jsx6(Search2, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }),
        /* @__PURE__ */ jsx6(
          "input",
          {
            type: "text",
            placeholder: "Ara...",
            value: searchValue,
            onChange: (e) => handleSearch(e.target.value),
            className: "pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          }
        )
      ] }),
      bulkActions && selectedRecords.length > 0 && /* @__PURE__ */ jsxs6("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxs6("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: [
          selectedRecords.length,
          " kay\u0131t se\xE7ildi"
        ] }),
        /* @__PURE__ */ jsx6("div", { className: "flex space-x-2", children: bulkActions.map((action) => /* @__PURE__ */ jsxs6(
          "button",
          {
            onClick: () => action.onClick(selectedRecords),
            className: `
                        inline-flex items-center px-3 py-1 text-sm font-medium rounded-md
                        ${action.variant === "danger" ? "text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30" : action.variant === "primary" ? "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30" : "text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"}
                      `,
            children: [
              action.icon && /* @__PURE__ */ jsx6("span", { className: "mr-1", children: action.icon }),
              action.label
            ]
          },
          action.key
        )) })
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsx6("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs6("table", { className: `min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${sizeClasses5[size]}`, children: [
      /* @__PURE__ */ jsx6("thead", { className: "bg-gray-50 dark:bg-gray-700", children: /* @__PURE__ */ jsxs6("tr", { children: [
        rowSelection && /* @__PURE__ */ jsx6("th", { className: `${cellPadding[size]} text-left`, children: /* @__PURE__ */ jsx6(
          "input",
          {
            type: "checkbox",
            checked: isAllSelected,
            ref: (input) => {
              if (input)
                input.indeterminate = !!isIndeterminate;
            },
            onChange: (e) => handleSelectAll(e.target.checked),
            className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          }
        ) }),
        columns.map((column) => /* @__PURE__ */ jsx6(
          "th",
          {
            className: `
                    ${cellPadding[size]} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                    ${column.sortable && sortable ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" : ""}
                    ${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "text-left"}
                  `,
            style: { width: column.width },
            onClick: () => column.sortable && handleSort(column.key),
            children: /* @__PURE__ */ jsxs6("div", { className: "flex items-center space-x-1", children: [
              /* @__PURE__ */ jsx6("span", { children: column.title }),
              column.sortable && sortable && /* @__PURE__ */ jsxs6("div", { className: "flex flex-col", children: [
                /* @__PURE__ */ jsx6(
                  ChevronUp,
                  {
                    className: `w-3 h-3 ${sortConfig?.key === column.key && sortConfig.direction === "asc" ? "text-blue-600" : "text-gray-400"}`
                  }
                ),
                /* @__PURE__ */ jsx6(
                  ChevronDown2,
                  {
                    className: `w-3 h-3 -mt-1 ${sortConfig?.key === column.key && sortConfig.direction === "desc" ? "text-blue-600" : "text-gray-400"}`
                  }
                )
              ] })
            ] })
          },
          column.key
        )),
        actions && actions.length > 0 && /* @__PURE__ */ jsx6("th", { className: `${cellPadding[size]} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`, children: "\u0130\u015Flemler" })
      ] }) }),
      /* @__PURE__ */ jsx6("tbody", { className: `bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${striped ? "divide-y-0" : ""}`, children: loading ? /* @__PURE__ */ jsx6("tr", { children: /* @__PURE__ */ jsx6("td", { colSpan: columns.length + (rowSelection ? 1 : 0) + (actions ? 1 : 0), className: "px-4 py-8 text-center", children: /* @__PURE__ */ jsxs6("div", { className: "flex items-center justify-center", children: [
        /* @__PURE__ */ jsx6("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" }),
        /* @__PURE__ */ jsx6("span", { className: "ml-2 text-gray-600 dark:text-gray-400", children: "Y\xFCkleniyor..." })
      ] }) }) }) : data.length === 0 ? /* @__PURE__ */ jsx6("tr", { children: /* @__PURE__ */ jsx6("td", { colSpan: columns.length + (rowSelection ? 1 : 0) + (actions ? 1 : 0), className: "px-4 py-8 text-center text-gray-500 dark:text-gray-400", children: emptyText }) }) : data.map((record, index) => {
        const key = getRowKey(record, index);
        const isSelected = rowSelection?.selectedRowKeys.includes(key);
        const checkboxProps = rowSelection?.getCheckboxProps?.(record) || {};
        return /* @__PURE__ */ jsxs6(
          "tr",
          {
            className: `
                      ${striped && index % 2 === 1 ? "bg-gray-50 dark:bg-gray-700/50" : ""}
                      ${hoverable ? "hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""}
                      ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                    `,
            children: [
              rowSelection && /* @__PURE__ */ jsx6("td", { className: cellPadding[size], children: /* @__PURE__ */ jsx6(
                "input",
                {
                  type: "checkbox",
                  checked: isSelected,
                  disabled: checkboxProps.disabled,
                  onChange: (e) => handleSelectRow(record, e.target.checked),
                  className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                }
              ) }),
              columns.map((column) => /* @__PURE__ */ jsx6(
                "td",
                {
                  className: `
                          ${cellPadding[size]} text-gray-900 dark:text-gray-100
                          ${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : "text-left"}
                          ${bordered ? "border-r border-gray-200 dark:border-gray-700 last:border-r-0" : ""}
                        `,
                  children: renderCell(column, record, index)
                },
                column.key
              )),
              actions && actions.length > 0 && /* @__PURE__ */ jsx6("td", { className: cellPadding[size], children: renderActions(record) })
            ]
          },
          key
        );
      }) })
    ] }) }),
    renderPagination()
  ] });
};

// src/components/ui/Button.tsx
import { Loader2 } from "lucide-react";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var variantClasses = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
  outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
  ghost: "text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
};
var sizeClasses2 = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base"
};
var Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses2[size],
    fullWidth ? "w-full" : "",
    className
  ].filter(Boolean).join(" ");
  const isDisabled = disabled || loading;
  return /* @__PURE__ */ jsxs7(
    "button",
    {
      className: classes,
      disabled: isDisabled,
      ...props,
      children: [
        loading && /* @__PURE__ */ jsx7(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }),
        !loading && icon && iconPosition === "left" && /* @__PURE__ */ jsx7("span", { className: "mr-2", children: icon }),
        children,
        !loading && icon && iconPosition === "right" && /* @__PURE__ */ jsx7("span", { className: "ml-2", children: icon })
      ]
    }
  );
};

// src/components/ui/Input.tsx
import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var Input = forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = "",
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const baseClasses = "block px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed";
  const stateClasses = error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  const widthClasses = fullWidth ? "w-full" : "";
  const paddingClasses = leftIcon && rightIcon ? "pl-10 pr-10" : leftIcon ? "pl-10" : rightIcon ? "pr-10" : "";
  const inputClasses = [
    baseClasses,
    stateClasses,
    widthClasses,
    paddingClasses,
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs8("div", { className: fullWidth ? "w-full" : "", children: [
    label && /* @__PURE__ */ jsx8(
      "label",
      {
        htmlFor: inputId,
        className: "block text-sm font-medium text-gray-700 mb-1",
        children: label
      }
    ),
    /* @__PURE__ */ jsxs8("div", { className: "relative", children: [
      leftIcon && /* @__PURE__ */ jsx8("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsx8("span", { className: "text-gray-400", children: leftIcon }) }),
      /* @__PURE__ */ jsx8(
        "input",
        {
          ref,
          id: inputId,
          className: inputClasses,
          ...props
        }
      ),
      rightIcon && !error && /* @__PURE__ */ jsx8("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsx8("span", { className: "text-gray-400", children: rightIcon }) }),
      error && /* @__PURE__ */ jsx8("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none", children: /* @__PURE__ */ jsx8(AlertCircle, { className: "w-5 h-5 text-red-500" }) })
    ] }),
    error && /* @__PURE__ */ jsx8("p", { className: "mt-1 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx8("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
  ] });
});
Input.displayName = "Input";

// src/components/ui/Select.tsx
import { forwardRef as forwardRef2 } from "react";
import { ChevronDown as ChevronDown3, AlertCircle as AlertCircle2 } from "lucide-react";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var Select = forwardRef2(({
  label,
  error,
  helperText,
  options,
  placeholder,
  fullWidth = false,
  className = "",
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const baseClasses = "block px-3 py-2 pr-10 border rounded-lg text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed appearance-none";
  const stateClasses = error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  const widthClasses = fullWidth ? "w-full" : "";
  const selectClasses = [
    baseClasses,
    stateClasses,
    widthClasses,
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs9("div", { className: fullWidth ? "w-full" : "", children: [
    label && /* @__PURE__ */ jsx9(
      "label",
      {
        htmlFor: selectId,
        className: "block text-sm font-medium text-gray-700 mb-1",
        children: label
      }
    ),
    /* @__PURE__ */ jsxs9("div", { className: "relative", children: [
      /* @__PURE__ */ jsxs9(
        "select",
        {
          ref,
          id: selectId,
          className: selectClasses,
          ...props,
          children: [
            placeholder && /* @__PURE__ */ jsx9("option", { value: "", disabled: true, children: placeholder }),
            options.map((option) => /* @__PURE__ */ jsx9(
              "option",
              {
                value: option.value,
                disabled: option.disabled,
                children: option.label
              },
              option.value
            ))
          ]
        }
      ),
      /* @__PURE__ */ jsx9("div", { className: "absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none", children: error ? /* @__PURE__ */ jsx9(AlertCircle2, { className: "w-5 h-5 text-red-500" }) : /* @__PURE__ */ jsx9(ChevronDown3, { className: "w-5 h-5 text-gray-400" }) })
    ] }),
    error && /* @__PURE__ */ jsx9("p", { className: "mt-1 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx9("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
  ] });
});
Select.displayName = "Select";

// src/components/ui/Textarea.tsx
import { forwardRef as forwardRef3 } from "react";
import { AlertCircle as AlertCircle3 } from "lucide-react";
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
var Textarea = forwardRef3(({
  label,
  error,
  helperText,
  fullWidth = false,
  resize = "vertical",
  className = "",
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const baseClasses = "block px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed";
  const stateClasses = error ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  const widthClasses = fullWidth ? "w-full" : "";
  const resizeClasses = {
    none: "resize-none",
    vertical: "resize-y",
    horizontal: "resize-x",
    both: "resize"
  };
  const textareaClasses = [
    baseClasses,
    stateClasses,
    widthClasses,
    resizeClasses[resize],
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs10("div", { className: fullWidth ? "w-full" : "", children: [
    label && /* @__PURE__ */ jsx10(
      "label",
      {
        htmlFor: textareaId,
        className: "block text-sm font-medium text-gray-700 mb-1",
        children: label
      }
    ),
    /* @__PURE__ */ jsxs10("div", { className: "relative", children: [
      /* @__PURE__ */ jsx10(
        "textarea",
        {
          ref,
          id: textareaId,
          className: textareaClasses,
          ...props
        }
      ),
      error && /* @__PURE__ */ jsx10("div", { className: "absolute top-2 right-2 pointer-events-none", children: /* @__PURE__ */ jsx10(AlertCircle3, { className: "w-5 h-5 text-red-500" }) })
    ] }),
    error && /* @__PURE__ */ jsx10("p", { className: "mt-1 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx10("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
  ] });
});
Textarea.displayName = "Textarea";

// src/components/ui/Badge.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
var variantClasses2 = {
  default: "bg-gray-100 text-gray-800",
  primary: "bg-blue-100 text-blue-800",
  secondary: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800"
};
var sizeClasses3 = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-sm",
  lg: "px-3 py-1 text-sm"
};
var Badge = ({
  children,
  variant = "default",
  size = "md",
  className = ""
}) => {
  const baseClasses = "inline-flex items-center font-medium rounded-full";
  const classes = [
    baseClasses,
    variantClasses2[variant],
    sizeClasses3[size],
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx11("span", { className: classes, children });
};

// src/components/ui/Checkbox.tsx
import { forwardRef as forwardRef4 } from "react";
import { Check as Check2, Minus as Minus2 } from "lucide-react";
import { jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
var Checkbox = forwardRef4(({
  label,
  error,
  helperText,
  indeterminate = false,
  className = "",
  id,
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  const baseClasses = "w-4 h-4 border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed";
  const stateClasses = error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500";
  const checkedClasses = props.checked || indeterminate ? "bg-blue-600 border-blue-600 text-white" : "bg-white";
  const checkboxClasses = [
    baseClasses,
    stateClasses,
    checkedClasses,
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs11("div", { className: "flex items-start", children: [
    /* @__PURE__ */ jsxs11("div", { className: "relative flex items-center", children: [
      /* @__PURE__ */ jsx12(
        "input",
        {
          ref,
          type: "checkbox",
          id: checkboxId,
          className: `${checkboxClasses} appearance-none`,
          ...props
        }
      ),
      /* @__PURE__ */ jsx12("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: indeterminate ? /* @__PURE__ */ jsx12(Minus2, { className: "w-3 h-3 text-white" }) : props.checked ? /* @__PURE__ */ jsx12(Check2, { className: "w-3 h-3 text-white" }) : null })
    ] }),
    (label || error || helperText) && /* @__PURE__ */ jsxs11("div", { className: "ml-2 flex-1", children: [
      label && /* @__PURE__ */ jsx12(
        "label",
        {
          htmlFor: checkboxId,
          className: "block text-sm font-medium text-gray-700 cursor-pointer",
          children: label
        }
      ),
      error && /* @__PURE__ */ jsx12("p", { className: "mt-1 text-sm text-red-600", children: error }),
      helperText && !error && /* @__PURE__ */ jsx12("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
    ] })
  ] });
});
Checkbox.displayName = "Checkbox";

// src/components/ui/Radio.tsx
import { forwardRef as forwardRef5 } from "react";
import { jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
var Radio = forwardRef5(({
  label,
  error,
  helperText,
  className = "",
  id,
  ...props
}, ref) => {
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
  const baseClasses = "w-4 h-4 border rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed";
  const stateClasses = error ? "border-red-300 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500";
  const checkedClasses = props.checked ? "bg-blue-600 border-blue-600" : "bg-white";
  const radioClasses = [
    baseClasses,
    stateClasses,
    checkedClasses,
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs12("div", { className: "flex items-start", children: [
    /* @__PURE__ */ jsxs12("div", { className: "relative flex items-center", children: [
      /* @__PURE__ */ jsx13(
        "input",
        {
          ref,
          type: "radio",
          id: radioId,
          className: `${radioClasses} appearance-none`,
          ...props
        }
      ),
      props.checked && /* @__PURE__ */ jsx13("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: /* @__PURE__ */ jsx13("div", { className: "w-2 h-2 bg-white rounded-full" }) })
    ] }),
    (label || error || helperText) && /* @__PURE__ */ jsxs12("div", { className: "ml-2 flex-1", children: [
      label && /* @__PURE__ */ jsx13(
        "label",
        {
          htmlFor: radioId,
          className: "block text-sm font-medium text-gray-700 cursor-pointer",
          children: label
        }
      ),
      error && /* @__PURE__ */ jsx13("p", { className: "mt-1 text-sm text-red-600", children: error }),
      helperText && !error && /* @__PURE__ */ jsx13("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
    ] })
  ] });
});
Radio.displayName = "Radio";
var RadioGroup = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  helperText,
  direction = "vertical",
  className = ""
}) => {
  const containerClasses = direction === "horizontal" ? "flex flex-wrap gap-4" : "space-y-2";
  return /* @__PURE__ */ jsxs12("div", { className, children: [
    label && /* @__PURE__ */ jsx13("div", { className: "block text-sm font-medium text-gray-700 mb-2", children: label }),
    /* @__PURE__ */ jsx13("div", { className: containerClasses, children: options.map((option) => /* @__PURE__ */ jsx13(
      Radio,
      {
        name,
        value: option.value,
        checked: value === option.value,
        onChange: () => onChange?.(option.value),
        disabled: option.disabled,
        label: option.label
      },
      option.value
    )) }),
    error && /* @__PURE__ */ jsx13("p", { className: "mt-1 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx13("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
  ] });
};

// src/components/ui/Spinner.tsx
import { Loader2 as Loader22 } from "lucide-react";
import { jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
var sizeClasses4 = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12"
};
var colorClasses2 = {
  primary: "text-blue-600",
  secondary: "text-gray-600",
  white: "text-white",
  gray: "text-gray-400"
};
var Spinner = ({
  size = "md",
  color = "primary",
  className = ""
}) => {
  const classes = [
    "animate-spin",
    sizeClasses4[size],
    colorClasses2[color],
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx14(Loader22, { className: classes });
};
var Loading = ({
  text = "Y\xFCkleniyor...",
  size = "md",
  color = "primary",
  center = false,
  className = ""
}) => {
  const containerClasses = [
    "flex items-center gap-2",
    center ? "justify-center" : "",
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs13("div", { className: containerClasses, children: [
    /* @__PURE__ */ jsx14(Spinner, { size, color }),
    text && /* @__PURE__ */ jsx14("span", { className: `text-sm ${colorClasses2[color]}`, children: text })
  ] });
};

// src/components/ui/DatePicker.tsx
import { useState as useState6, useRef as useRef2, useEffect as useEffect4 } from "react";
import { Calendar as Calendar2, ChevronLeft as ChevronLeft2, ChevronRight as ChevronRight3, AlertCircle as AlertCircle4 } from "lucide-react";
import { clsx } from "clsx";
import { jsx as jsx15, jsxs as jsxs14 } from "react/jsx-runtime";
var cn = (...classes) => {
  return clsx(classes);
};
var MONTHS = [
  "Ocak",
  "\u015Eubat",
  "Mart",
  "Nisan",
  "May\u0131s",
  "Haziran",
  "Temmuz",
  "A\u011Fustos",
  "Eyl\xFCl",
  "Ekim",
  "Kas\u0131m",
  "Aral\u0131k"
];
var DAYS = ["Pzt", "Sal", "\xC7ar", "Per", "Cum", "Cmt", "Paz"];
var DatePicker = ({
  value,
  onChange,
  placeholder = "Tarih se\xE7in",
  label,
  error,
  helperText,
  disabled = false,
  minDate,
  maxDate,
  dateFormat = "dd/MM/yyyy",
  showTime = false,
  fullWidth = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState6(false);
  const [currentMonth, setCurrentMonth] = useState6(value || /* @__PURE__ */ new Date());
  const [timeValue, setTimeValue] = useState6(
    value ? `${value.getHours().toString().padStart(2, "0")}:${value.getMinutes().toString().padStart(2, "0")}` : "00:00"
  );
  const containerRef = useRef2(null);
  useEffect4(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const formatDate = (date) => {
    if (!date)
      return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    if (showTime) {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    return `${day}/${month}/${year}`;
  };
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const days2 = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days2.push(new Date(year, month, -firstDayOfWeek + i + 1));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days2.push(new Date(year, month, day));
    }
    const remainingCells = 42 - days2.length;
    for (let day = 1; day <= remainingCells; day++) {
      days2.push(new Date(year, month + 1, day));
    }
    return days2;
  };
  const isDateDisabled = (date) => {
    if (minDate && date < minDate)
      return true;
    if (maxDate && date > maxDate)
      return true;
    return false;
  };
  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };
  const handleDateSelect = (date) => {
    if (isDateDisabled(date))
      return;
    let selectedDate = new Date(date);
    if (showTime && timeValue) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      selectedDate.setHours(hours, minutes);
    }
    onChange?.(selectedDate);
    if (!showTime) {
      setIsOpen(false);
    }
  };
  const handleTimeChange = (time) => {
    setTimeValue(time);
    if (value) {
      const [hours, minutes] = time.split(":").map(Number);
      const newDate = new Date(value);
      newDate.setHours(hours, minutes);
      onChange?.(newDate);
    }
  };
  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  const days = getDaysInMonth(currentMonth);
  const currentMonthNumber = currentMonth.getMonth();
  return /* @__PURE__ */ jsxs14("div", { ref: containerRef, className: cn("relative", fullWidth ? "w-full" : "w-auto", className), children: [
    label && /* @__PURE__ */ jsx15("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: label }),
    /* @__PURE__ */ jsxs14("div", { className: "relative", children: [
      /* @__PURE__ */ jsx15(
        "input",
        {
          type: "text",
          value: formatDate(value),
          placeholder,
          disabled,
          readOnly: true,
          onClick: () => !disabled && setIsOpen(!isOpen),
          className: cn(
            "w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer",
            error ? "border-red-300" : "border-gray-300",
            disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white",
            fullWidth ? "w-full" : ""
          )
        }
      ),
      /* @__PURE__ */ jsx15("div", { className: "absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none", children: error ? /* @__PURE__ */ jsx15(AlertCircle4, { className: "h-4 w-4 text-red-500" }) : /* @__PURE__ */ jsx15(Calendar2, { className: "h-4 w-4 text-gray-400" }) })
    ] }),
    isOpen && /* @__PURE__ */ jsxs14("div", { className: "absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 min-w-[280px]", children: [
      /* @__PURE__ */ jsxs14("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx15(
          "button",
          {
            type: "button",
            onClick: () => navigateMonth("prev"),
            className: "p-1 hover:bg-gray-100 rounded",
            children: /* @__PURE__ */ jsx15(ChevronLeft2, { className: "h-4 w-4" })
          }
        ),
        /* @__PURE__ */ jsxs14("h3", { className: "text-sm font-medium", children: [
          MONTHS[currentMonth.getMonth()],
          " ",
          currentMonth.getFullYear()
        ] }),
        /* @__PURE__ */ jsx15(
          "button",
          {
            type: "button",
            onClick: () => navigateMonth("next"),
            className: "p-1 hover:bg-gray-100 rounded",
            children: /* @__PURE__ */ jsx15(ChevronRight3, { className: "h-4 w-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsx15("div", { className: "grid grid-cols-7 gap-1 mb-2", children: DAYS.map((day) => /* @__PURE__ */ jsx15("div", { className: "text-xs font-medium text-gray-500 text-center p-1", children: day }, day)) }),
      /* @__PURE__ */ jsx15("div", { className: "grid grid-cols-7 gap-1", children: days.map((date, index) => {
        const isCurrentMonth = date.getMonth() === currentMonthNumber;
        const isSelected = value ? isSameDay(date, value) : false;
        const isToday = isSameDay(date, /* @__PURE__ */ new Date());
        const disabled2 = isDateDisabled(date);
        return /* @__PURE__ */ jsx15(
          "button",
          {
            type: "button",
            onClick: () => handleDateSelect(date),
            disabled: disabled2,
            className: cn(
              "p-1 text-sm rounded hover:bg-gray-100 transition-colors",
              !isCurrentMonth && "text-gray-300",
              isCurrentMonth && "text-gray-900",
              isSelected && "bg-blue-500 text-white hover:bg-blue-600",
              isToday && !isSelected && "bg-blue-50 text-blue-600",
              disabled2 && "cursor-not-allowed opacity-50"
            ),
            children: date.getDate()
          },
          index
        );
      }) }),
      showTime && /* @__PURE__ */ jsxs14("div", { className: "mt-4 pt-4 border-t border-gray-200", children: [
        /* @__PURE__ */ jsx15("label", { className: "block text-xs font-medium text-gray-700 mb-2", children: "Saat" }),
        /* @__PURE__ */ jsx15(
          "input",
          {
            type: "time",
            value: timeValue,
            onChange: (e) => handleTimeChange(e.target.value),
            className: "w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          }
        )
      ] })
    ] }),
    (error || helperText) && /* @__PURE__ */ jsx15("div", { className: "mt-1 text-sm", children: error ? /* @__PURE__ */ jsxs14("span", { className: "text-red-600 flex items-center gap-1", children: [
      /* @__PURE__ */ jsx15(AlertCircle4, { className: "h-3 w-3" }),
      error
    ] }) : /* @__PURE__ */ jsx15("span", { className: "text-gray-500", children: helperText }) })
  ] });
};

// src/components/ui/Toast.tsx
import { useState as useState7, useEffect as useEffect5, createContext, useContext } from "react";
import { X as X3, CheckCircle, AlertCircle as AlertCircle5, AlertTriangle, Info } from "lucide-react";
import { clsx as clsx2 } from "clsx";
import { jsx as jsx16, jsxs as jsxs15 } from "react/jsx-runtime";
var cn2 = (...classes) => {
  return clsx2(classes);
};
var ToastContext = createContext(void 0);
var useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
var ToastProvider = ({
  children,
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState7([]);
  const addToast = (toast2) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = {
      ...toast2,
      id,
      duration: toast2.duration ?? 5e3
    };
    setToasts((prev) => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast2) => toast2.id !== id));
  };
  const clearAll = () => {
    setToasts([]);
  };
  return /* @__PURE__ */ jsxs15(ToastContext.Provider, { value: { toasts, addToast, removeToast, clearAll }, children: [
    children,
    /* @__PURE__ */ jsx16(ToastContainer, {})
  ] });
};
var ToastContainer = () => {
  const { toasts } = useToast();
  return /* @__PURE__ */ jsx16("div", { className: "fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full", children: toasts.map((toast2) => /* @__PURE__ */ jsx16(ToastItem, { toast: toast2 }, toast2.id)) });
};
var ToastItem = ({ toast: toast2 }) => {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState7(false);
  const [isLeaving, setIsLeaving] = useState7(false);
  useEffect5(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      removeToast(toast2.id);
    }, 150);
  };
  const getIcon = () => {
    switch (toast2.type) {
      case "success":
        return /* @__PURE__ */ jsx16(CheckCircle, { className: "h-5 w-5 text-green-500" });
      case "error":
        return /* @__PURE__ */ jsx16(AlertCircle5, { className: "h-5 w-5 text-red-500" });
      case "warning":
        return /* @__PURE__ */ jsx16(AlertTriangle, { className: "h-5 w-5 text-yellow-500" });
      case "info":
        return /* @__PURE__ */ jsx16(Info, { className: "h-5 w-5 text-blue-500" });
      default:
        return /* @__PURE__ */ jsx16(Info, { className: "h-5 w-5 text-gray-500" });
    }
  };
  const getBackgroundColor = () => {
    switch (toast2.type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };
  return /* @__PURE__ */ jsx16(
    "div",
    {
      className: cn2(
        "transform transition-all duration-300 ease-in-out",
        isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        "bg-white border rounded-lg shadow-lg p-4 min-w-0",
        getBackgroundColor()
      ),
      children: /* @__PURE__ */ jsxs15("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx16("div", { className: "flex-shrink-0", children: getIcon() }),
        /* @__PURE__ */ jsxs15("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs15("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxs15("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx16("h4", { className: "text-sm font-medium text-gray-900 truncate", children: toast2.title }),
              toast2.message && /* @__PURE__ */ jsx16("p", { className: "mt-1 text-sm text-gray-600 break-words", children: toast2.message })
            ] }),
            /* @__PURE__ */ jsx16(
              "button",
              {
                onClick: handleClose,
                className: "flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors",
                children: /* @__PURE__ */ jsx16(X3, { className: "h-4 w-4 text-gray-400" })
              }
            )
          ] }),
          toast2.action && /* @__PURE__ */ jsx16("div", { className: "mt-3", children: /* @__PURE__ */ jsx16(
            "button",
            {
              onClick: toast2.action.onClick,
              className: "text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors",
              children: toast2.action.label
            }
          ) })
        ] })
      ] })
    }
  );
};
var toast = {
  success: (title, message, options) => ({
    type: "success",
    title,
    message,
    ...options
  }),
  error: (title, message, options) => ({
    type: "error",
    title,
    message,
    ...options
  }),
  warning: (title, message, options) => ({
    type: "warning",
    title,
    message,
    ...options
  }),
  info: (title, message, options) => ({
    type: "info",
    title,
    message,
    ...options
  })
};
var useToastHelpers = () => {
  const { addToast } = useToast();
  return {
    success: (title, message, options) => {
      addToast(toast.success(title, message, options));
    },
    error: (title, message, options) => {
      addToast(toast.error(title, message, options));
    },
    warning: (title, message, options) => {
      addToast(toast.warning(title, message, options));
    },
    info: (title, message, options) => {
      addToast(toast.info(title, message, options));
    }
  };
};

// src/components/ui/Tabs.tsx
import { useState as useState8, createContext as createContext2, useContext as useContext2 } from "react";
import { clsx as clsx3 } from "clsx";
import { jsx as jsx17, jsxs as jsxs16 } from "react/jsx-runtime";
var cn3 = (...classes) => {
  return clsx3(classes);
};
var TabsContext = createContext2(void 0);
var useTabsContext = () => {
  const context = useContext2(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
};
var Tabs = ({
  children,
  defaultValue,
  value,
  onValueChange,
  orientation = "horizontal",
  className
}) => {
  const [internalValue, setInternalValue] = useState8(defaultValue || "");
  const activeTab = value !== void 0 ? value : internalValue;
  const setActiveTab = (newValue) => {
    if (value === void 0) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };
  return /* @__PURE__ */ jsx17(TabsContext.Provider, { value: { activeTab, setActiveTab, orientation }, children: /* @__PURE__ */ jsx17(
    "div",
    {
      className: cn3(
        "tabs",
        orientation === "vertical" ? "flex gap-4" : "space-y-2",
        className
      ),
      children
    }
  ) });
};
var TabsList = ({ children, className }) => {
  const { orientation } = useTabsContext();
  return /* @__PURE__ */ jsx17(
    "div",
    {
      className: cn3(
        "tabs-list",
        orientation === "horizontal" ? "flex border-b border-gray-200" : "flex flex-col space-y-1 min-w-[200px]",
        className
      ),
      role: "tablist",
      "aria-orientation": orientation,
      children
    }
  );
};
var TabsTrigger = ({
  children,
  value,
  disabled = false,
  className
}) => {
  const { activeTab, setActiveTab, orientation } = useTabsContext();
  const isActive = activeTab === value;
  const handleClick = () => {
    if (!disabled) {
      setActiveTab(value);
    }
  };
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };
  return /* @__PURE__ */ jsx17(
    "button",
    {
      type: "button",
      role: "tab",
      "aria-selected": isActive,
      "aria-controls": `tabpanel-${value}`,
      tabIndex: isActive ? 0 : -1,
      disabled,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      className: cn3(
        "tabs-trigger transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        orientation === "horizontal" ? cn3(
          "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
          isActive ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
          disabled && "opacity-50 cursor-not-allowed"
        ) : cn3(
          "px-3 py-2 text-sm font-medium rounded-md text-left",
          isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
          disabled && "opacity-50 cursor-not-allowed"
        ),
        className
      ),
      children
    }
  );
};
var TabsContent = ({
  children,
  value,
  className
}) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;
  if (!isActive) {
    return null;
  }
  return /* @__PURE__ */ jsx17(
    "div",
    {
      role: "tabpanel",
      id: `tabpanel-${value}`,
      "aria-labelledby": `tab-${value}`,
      className: cn3("tabs-content focus:outline-none", className),
      tabIndex: 0,
      children
    }
  );
};
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

// src/components/ui/Autocomplete.tsx
import { useState as useState9, useRef as useRef3, useEffect as useEffect6, useCallback as useCallback2 } from "react";
import { clsx as clsx4 } from "clsx";
import { jsx as jsx18, jsxs as jsxs17 } from "react/jsx-runtime";
var defaultFilterOptions = (options, query) => {
  const lowerQuery = query.toLowerCase();
  return options.filter(
    (option) => option.label.toLowerCase().includes(lowerQuery) || option.value.toLowerCase().includes(lowerQuery) || option.description && option.description.toLowerCase().includes(lowerQuery)
  );
};
var Autocomplete = ({
  options = [],
  value,
  onChange,
  onSearch,
  placeholder = "Arama yap\u0131n...",
  label,
  error,
  helperText,
  disabled = false,
  loading = false,
  allowClear = true,
  minSearchLength = 1,
  maxResults = 10,
  searchDelay = 300,
  noResultsText = "Sonu\xE7 bulunamad\u0131",
  loadingText = "Y\xFCkleniyor...",
  className,
  dropdownClassName,
  optionClassName,
  renderOption,
  filterOptions = defaultFilterOptions
}) => {
  const [isOpen, setIsOpen] = useState9(false);
  const [searchQuery, setSearchQuery] = useState9("");
  const [highlightedIndex, setHighlightedIndex] = useState9(-1);
  const [filteredOptions, setFilteredOptions] = useState9([]);
  const inputRef = useRef3(null);
  const dropdownRef = useRef3(null);
  const searchTimeoutRef = useRef3();
  useEffect6(() => {
    if (searchQuery.length >= minSearchLength) {
      const filtered = filterOptions(options, searchQuery).slice(0, maxResults);
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions([]);
    }
  }, [options, searchQuery, minSearchLength, maxResults, filterOptions]);
  const handleSearch = useCallback2((query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch && query.length >= minSearchLength) {
        onSearch(query);
      }
    }, searchDelay);
  }, [onSearch, minSearchLength, searchDelay]);
  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedIndex(-1);
    if (!isOpen && query.length >= minSearchLength) {
      setIsOpen(true);
    }
    handleSearch(query);
  };
  const handleOptionSelect = (option) => {
    onChange(option);
    setSearchQuery(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };
  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };
  const handleKeyDown = (e) => {
    if (disabled)
      return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(
            (prev) => prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(
            (prev) => prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case "Enter":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      case "Tab":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };
  useEffect6(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect6(() => {
    if (value) {
      setSearchQuery(value.label);
    } else if (!isOpen) {
      setSearchQuery("");
    }
  }, [value, isOpen]);
  useEffect6(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  const showDropdown = isOpen && (filteredOptions.length > 0 || loading || searchQuery.length >= minSearchLength && filteredOptions.length === 0);
  return /* @__PURE__ */ jsxs17("div", { className: clsx4("relative w-full", className), children: [
    label && /* @__PURE__ */ jsx18("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: label }),
    /* @__PURE__ */ jsxs17("div", { className: "relative", children: [
      /* @__PURE__ */ jsx18(
        "input",
        {
          ref: inputRef,
          type: "text",
          value: searchQuery,
          onChange: handleInputChange,
          onKeyDown: handleKeyDown,
          onFocus: () => {
            if (searchQuery.length >= minSearchLength) {
              setIsOpen(true);
            }
          },
          placeholder,
          disabled,
          className: clsx4(
            "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500",
            allowClear && value && "pr-16"
          )
        }
      ),
      loading && /* @__PURE__ */ jsx18("div", { className: "absolute right-3 top-1/2 transform -translate-y-1/2", children: /* @__PURE__ */ jsx18("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" }) }),
      allowClear && value && !loading && /* @__PURE__ */ jsx18(
        "button",
        {
          type: "button",
          onClick: handleClear,
          className: "absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600",
          disabled,
          children: /* @__PURE__ */ jsx18("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx18("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
        }
      ),
      /* @__PURE__ */ jsx18("div", { className: "absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none", children: /* @__PURE__ */ jsx18(
        "svg",
        {
          className: clsx4(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          ),
          fill: "none",
          stroke: "currentColor",
          viewBox: "0 0 24 24",
          children: /* @__PURE__ */ jsx18("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
        }
      ) })
    ] }),
    showDropdown && /* @__PURE__ */ jsx18(
      "div",
      {
        ref: dropdownRef,
        className: clsx4(
          "absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto",
          dropdownClassName
        ),
        children: loading ? /* @__PURE__ */ jsx18("div", { className: "px-3 py-2 text-sm text-gray-500 text-center", children: loadingText }) : filteredOptions.length > 0 ? filteredOptions.map((option, index) => /* @__PURE__ */ jsx18(
          "div",
          {
            onClick: () => handleOptionSelect(option),
            className: clsx4(
              "px-3 py-2 cursor-pointer text-sm",
              "hover:bg-gray-100",
              index === highlightedIndex && "bg-blue-50 text-blue-700",
              optionClassName
            ),
            children: renderOption ? renderOption(option) : /* @__PURE__ */ jsxs17("div", { children: [
              /* @__PURE__ */ jsx18("div", { className: "font-medium", children: option.label }),
              option.description && /* @__PURE__ */ jsx18("div", { className: "text-xs text-gray-500 mt-1", children: option.description }),
              option.category && /* @__PURE__ */ jsx18("div", { className: "text-xs text-blue-600 mt-1", children: option.category })
            ] })
          },
          option.id
        )) : /* @__PURE__ */ jsx18("div", { className: "px-3 py-2 text-sm text-gray-500 text-center", children: noResultsText })
      }
    ),
    error && /* @__PURE__ */ jsx18("p", { className: "mt-1 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx18("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
  ] });
};

// src/components/ui/MultiSelect.tsx
import { useState as useState10, useRef as useRef4, useEffect as useEffect7, useCallback as useCallback3 } from "react";
import { clsx as clsx5 } from "clsx";
import { jsx as jsx19, jsxs as jsxs18 } from "react/jsx-runtime";
var defaultFilterOptions2 = (options, query) => {
  const lowerQuery = query.toLowerCase();
  return options.filter(
    (option) => option.label.toLowerCase().includes(lowerQuery) || option.value.toLowerCase().includes(lowerQuery) || option.description && option.description.toLowerCase().includes(lowerQuery)
  );
};
var MultiSelect = ({
  options = [],
  value = [],
  onChange,
  onSearch,
  placeholder = "Se\xE7enekleri se\xE7in...",
  label,
  error,
  helperText,
  disabled = false,
  loading = false,
  searchable = true,
  clearable = true,
  selectAll = false,
  maxSelections,
  minSearchLength = 1,
  maxResults = 10,
  searchDelay = 300,
  noResultsText = "Sonu\xE7 bulunamad\u0131",
  loadingText = "Y\xFCkleniyor...",
  selectAllText = "T\xFCm\xFCn\xFC Se\xE7",
  clearAllText = "T\xFCm\xFCn\xFC Temizle",
  selectedText = "se\xE7ili",
  className,
  dropdownClassName,
  optionClassName,
  tagClassName,
  renderOption,
  renderTag,
  filterOptions = defaultFilterOptions2
}) => {
  const [isOpen, setIsOpen] = useState10(false);
  const [searchQuery, setSearchQuery] = useState10("");
  const [filteredOptions, setFilteredOptions] = useState10([]);
  const inputRef = useRef4(null);
  const dropdownRef = useRef4(null);
  const containerRef = useRef4(null);
  const searchTimeoutRef = useRef4();
  useEffect7(() => {
    let filtered = options;
    if (searchable && searchQuery.length >= minSearchLength) {
      filtered = filterOptions(options, searchQuery);
    }
    filtered = filtered.filter(
      (option) => !value.some((selected) => selected.id === option.id)
    );
    setFilteredOptions(filtered.slice(0, maxResults));
  }, [options, searchQuery, value, searchable, minSearchLength, maxResults, filterOptions]);
  const handleSearch = useCallback3((query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch && query.length >= minSearchLength) {
        onSearch(query);
      }
    }, searchDelay);
  }, [onSearch, minSearchLength, searchDelay]);
  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!isOpen && query.length >= minSearchLength) {
      setIsOpen(true);
    }
    handleSearch(query);
  };
  const handleOptionSelect = (option) => {
    if (option.disabled)
      return;
    if (maxSelections && value.length >= maxSelections) {
      return;
    }
    const newValue = [...value, option];
    onChange(newValue);
    if (searchable) {
      setSearchQuery("");
    }
  };
  const handleOptionRemove = (optionToRemove) => {
    const newValue = value.filter((option) => option.id !== optionToRemove.id);
    onChange(newValue);
  };
  const handleSelectAll = () => {
    const availableOptions = options.filter(
      (option) => !option.disabled && !value.some((selected) => selected.id === option.id)
    );
    let newOptions = availableOptions;
    if (maxSelections) {
      const remainingSlots = maxSelections - value.length;
      newOptions = availableOptions.slice(0, remainingSlots);
    }
    onChange([...value, ...newOptions]);
  };
  const handleClearAll = () => {
    onChange([]);
    if (searchable) {
      setSearchQuery("");
    }
  };
  useEffect7(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect7(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  const showDropdown = isOpen && (filteredOptions.length > 0 || loading || searchQuery.length >= minSearchLength && filteredOptions.length === 0);
  const hasSelections = value.length > 0;
  const canSelectMore = !maxSelections || value.length < maxSelections;
  const defaultRenderTag = (option, onRemove) => /* @__PURE__ */ jsxs18(
    "span",
    {
      className: clsx5(
        "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
        "bg-blue-100 text-blue-800 border border-blue-200",
        tagClassName
      ),
      children: [
        option.label,
        /* @__PURE__ */ jsx19(
          "button",
          {
            type: "button",
            onClick: onRemove,
            className: "ml-1 text-blue-600 hover:text-blue-800",
            disabled,
            children: /* @__PURE__ */ jsx19("svg", { className: "w-3 h-3", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx19("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
          }
        )
      ]
    }
  );
  return /* @__PURE__ */ jsxs18("div", { ref: containerRef, className: clsx5("relative w-full", className), children: [
    label && /* @__PURE__ */ jsx19("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: label }),
    /* @__PURE__ */ jsxs18(
      "div",
      {
        className: clsx5(
          "min-h-[2.5rem] w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
          "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
          error && "border-red-500 focus-within:ring-red-500 focus-within:border-red-500",
          "cursor-text"
        ),
        onClick: () => {
          if (!disabled && searchable) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        },
        children: [
          /* @__PURE__ */ jsxs18("div", { className: "flex flex-wrap gap-1 items-center", children: [
            value.map((option) => /* @__PURE__ */ jsx19("div", { children: renderTag ? renderTag(option, () => handleOptionRemove(option)) : defaultRenderTag(option, () => handleOptionRemove(option)) }, option.id)),
            searchable && /* @__PURE__ */ jsx19(
              "input",
              {
                ref: inputRef,
                type: "text",
                value: searchQuery,
                onChange: handleInputChange,
                onFocus: () => setIsOpen(true),
                placeholder: hasSelections ? "" : placeholder,
                disabled,
                className: "flex-1 min-w-[120px] outline-none bg-transparent"
              }
            ),
            !searchable && !hasSelections && /* @__PURE__ */ jsx19("span", { className: "text-gray-500", children: placeholder }),
            hasSelections && !searchable && /* @__PURE__ */ jsxs18("span", { className: "text-sm text-gray-600", children: [
              value.length,
              " ",
              selectedText
            ] })
          ] }),
          /* @__PURE__ */ jsxs18("div", { className: "absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1", children: [
            loading && /* @__PURE__ */ jsx19("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" }),
            clearable && hasSelections && !loading && /* @__PURE__ */ jsx19(
              "button",
              {
                type: "button",
                onClick: (e) => {
                  e.stopPropagation();
                  handleClearAll();
                },
                className: "text-gray-400 hover:text-gray-600",
                disabled,
                children: /* @__PURE__ */ jsx19("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx19("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
              }
            ),
            /* @__PURE__ */ jsx19("div", { className: "text-gray-400", children: /* @__PURE__ */ jsx19(
              "svg",
              {
                className: clsx5(
                  "w-4 h-4 transition-transform",
                  isOpen && "rotate-180"
                ),
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /* @__PURE__ */ jsx19("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
              }
            ) })
          ] })
        ]
      }
    ),
    showDropdown && /* @__PURE__ */ jsxs18(
      "div",
      {
        ref: dropdownRef,
        className: clsx5(
          "absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto",
          dropdownClassName
        ),
        children: [
          selectAll && !loading && filteredOptions.length > 0 && /* @__PURE__ */ jsx19("div", { className: "border-b border-gray-200", children: /* @__PURE__ */ jsxs18("div", { className: "flex justify-between items-center px-3 py-2", children: [
            /* @__PURE__ */ jsx19(
              "button",
              {
                type: "button",
                onClick: handleSelectAll,
                disabled: !canSelectMore,
                className: clsx5(
                  "text-sm font-medium",
                  canSelectMore ? "text-blue-600 hover:text-blue-800" : "text-gray-400 cursor-not-allowed"
                ),
                children: selectAllText
              }
            ),
            hasSelections && /* @__PURE__ */ jsx19(
              "button",
              {
                type: "button",
                onClick: handleClearAll,
                className: "text-sm font-medium text-red-600 hover:text-red-800",
                children: clearAllText
              }
            )
          ] }) }),
          loading ? /* @__PURE__ */ jsx19("div", { className: "px-3 py-2 text-sm text-gray-500 text-center", children: loadingText }) : filteredOptions.length > 0 ? filteredOptions.map((option) => /* @__PURE__ */ jsx19(
            "div",
            {
              onClick: () => handleOptionSelect(option),
              className: clsx5(
                "px-3 py-2 cursor-pointer text-sm",
                "hover:bg-gray-100",
                option.disabled && "opacity-50 cursor-not-allowed",
                !canSelectMore && "opacity-50 cursor-not-allowed",
                optionClassName
              ),
              children: renderOption ? renderOption(option) : /* @__PURE__ */ jsxs18("div", { children: [
                /* @__PURE__ */ jsx19("div", { className: "font-medium", children: option.label }),
                option.description && /* @__PURE__ */ jsx19("div", { className: "text-xs text-gray-500 mt-1", children: option.description }),
                option.category && /* @__PURE__ */ jsx19("div", { className: "text-xs text-blue-600 mt-1", children: option.category })
              ] })
            },
            option.id
          )) : /* @__PURE__ */ jsx19("div", { className: "px-3 py-2 text-sm text-gray-500 text-center", children: noResultsText }),
          maxSelections && value.length >= maxSelections && /* @__PURE__ */ jsxs18("div", { className: "border-t border-gray-200 px-3 py-2 text-xs text-amber-600 bg-amber-50", children: [
            "Maksimum ",
            maxSelections,
            " se\xE7im yapabilirsiniz"
          ] })
        ]
      }
    ),
    error && /* @__PURE__ */ jsx19("p", { className: "mt-1 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx19("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
  ] });
};

// src/components/ui/FileUpload.tsx
import { useState as useState11, useRef as useRef5, useCallback as useCallback4 } from "react";
import { clsx as clsx6 } from "clsx";
import { Fragment as Fragment2, jsx as jsx20, jsxs as jsxs19 } from "react/jsx-runtime";
var formatFileSize = (bytes) => {
  if (bytes === 0)
    return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
var generateFileId = () => {
  return Math.random().toString(36).substr(2, 9);
};
var isImageFile = (type) => {
  return type.startsWith("image/");
};
var FileUpload = ({
  value = [],
  onChange,
  onUpload,
  onRemove,
  accept,
  multiple = false,
  maxFiles,
  maxSize,
  minSize,
  disabled = false,
  dragAndDrop = true,
  showPreview = true,
  showProgress = true,
  allowReorder = false,
  label,
  description,
  error,
  helperText,
  uploadText = "Dosya Y\xFCkle",
  dragText = "Dosyalar\u0131 buraya s\xFCr\xFCkleyin veya",
  browseText = "g\xF6z at\u0131n",
  removeText = "Kald\u0131r",
  retryText = "Tekrar Dene",
  className,
  dropzoneClassName,
  fileListClassName,
  fileItemClassName,
  renderFile
}) => {
  const [isDragOver, setIsDragOver] = useState11(false);
  const fileInputRef = useRef5(null);
  const validateFile = (file) => {
    if (maxSize && file.size > maxSize) {
      return `Dosya boyutu ${formatFileSize(maxSize)}'dan b\xFCy\xFCk olamaz`;
    }
    if (minSize && file.size < minSize) {
      return `Dosya boyutu ${formatFileSize(minSize)}'dan k\xFC\xE7\xFCk olamaz`;
    }
    if (accept) {
      const acceptedTypes = accept.split(",").map((type) => type.trim());
      const isAccepted = acceptedTypes.some((acceptedType) => {
        if (acceptedType.startsWith(".")) {
          return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
        }
        if (acceptedType.includes("*")) {
          const baseType = acceptedType.split("/")[0];
          return file.type.startsWith(baseType);
        }
        return file.type === acceptedType;
      });
      if (!isAccepted) {
        return `Desteklenmeyen dosya t\xFCr\xFC. Kabul edilen t\xFCrler: ${accept}`;
      }
    }
    return null;
  };
  const createFilePreview = (file) => {
    return new Promise((resolve) => {
      if (isImageFile(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result);
        reader.readAsDataURL(file);
      } else {
        resolve("");
      }
    });
  };
  const processFiles = useCallback4(async (files) => {
    if (disabled)
      return;
    const currentFiles = value;
    let newFiles = [];
    if (maxFiles && currentFiles.length + files.length > maxFiles) {
      const allowedCount = maxFiles - currentFiles.length;
      files = files.slice(0, allowedCount);
    }
    for (const file of files) {
      const validationError = validateFile(file);
      const preview = showPreview ? await createFilePreview(file) : void 0;
      const fileUpload = {
        id: generateFileId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validationError ? "error" : "pending",
        error: validationError || void 0,
        preview
      };
      newFiles.push(fileUpload);
    }
    const updatedFiles = [...currentFiles, ...newFiles];
    onChange(updatedFiles);
    if (onUpload) {
      for (const fileUpload of newFiles) {
        if (fileUpload.status === "pending") {
          handleUpload(fileUpload);
        }
      }
    }
  }, [value, onChange, onUpload, disabled, maxFiles, maxSize, minSize, accept, showPreview]);
  const handleUpload = async (fileUpload) => {
    if (!onUpload)
      return;
    const updatedFiles = value.map(
      (f) => f.id === fileUpload.id ? { ...f, status: "uploading", progress: 0 } : f
    );
    onChange(updatedFiles);
    try {
      const result = await onUpload(fileUpload.file);
      const successFiles = value.map(
        (f) => f.id === fileUpload.id ? {
          ...f,
          status: "success",
          progress: 100,
          url: result.url,
          id: result.id || f.id
        } : f
      );
      onChange(successFiles);
    } catch (error2) {
      const errorFiles = value.map(
        (f) => f.id === fileUpload.id ? {
          ...f,
          status: "error",
          error: error2 instanceof Error ? error2.message : "Y\xFCkleme hatas\u0131"
        } : f
      );
      onChange(errorFiles);
    }
  };
  const handleRemove = async (fileUpload) => {
    if (disabled)
      return;
    try {
      if (onRemove) {
        await onRemove(fileUpload);
      }
      const updatedFiles = value.filter((f) => f.id !== fileUpload.id);
      onChange(updatedFiles);
    } catch (error2) {
      console.error("File removal failed:", error2);
    }
  };
  const handleRetry = (fileUpload) => {
    if (fileUpload.status === "error") {
      handleUpload(fileUpload);
    }
  };
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    e.target.value = "";
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && dragAndDrop) {
      setIsDragOver(true);
    }
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || !dragAndDrop)
      return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };
  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };
  const canAddMore = !maxFiles || value.length < maxFiles;
  const defaultRenderFile = (file, onRemove2, onRetry) => /* @__PURE__ */ jsxs19(
    "div",
    {
      className: clsx6(
        "flex items-center p-3 border border-gray-200 rounded-lg",
        file.status === "error" && "border-red-200 bg-red-50",
        file.status === "success" && "border-green-200 bg-green-50",
        file.status === "uploading" && "border-blue-200 bg-blue-50",
        fileItemClassName
      ),
      children: [
        showPreview && file.preview && /* @__PURE__ */ jsx20(
          "img",
          {
            src: file.preview,
            alt: file.name,
            className: "w-12 h-12 object-cover rounded mr-3"
          }
        ),
        (!showPreview || !file.preview) && /* @__PURE__ */ jsx20("div", { className: "w-12 h-12 bg-gray-100 rounded flex items-center justify-center mr-3", children: /* @__PURE__ */ jsx20("svg", { className: "w-6 h-6 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx20("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }) }),
        /* @__PURE__ */ jsxs19("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx20("p", { className: "text-sm font-medium text-gray-900 truncate", children: file.name }),
          /* @__PURE__ */ jsx20("p", { className: "text-xs text-gray-500", children: formatFileSize(file.size) }),
          showProgress && file.status === "uploading" && typeof file.progress === "number" && /* @__PURE__ */ jsx20("div", { className: "mt-2", children: /* @__PURE__ */ jsx20("div", { className: "bg-gray-200 rounded-full h-1", children: /* @__PURE__ */ jsx20(
            "div",
            {
              className: "bg-blue-500 h-1 rounded-full transition-all duration-300",
              style: { width: `${file.progress}%` }
            }
          ) }) }),
          file.status === "error" && file.error && /* @__PURE__ */ jsx20("p", { className: "text-xs text-red-600 mt-1", children: file.error })
        ] }),
        /* @__PURE__ */ jsxs19("div", { className: "flex items-center gap-2 ml-3", children: [
          file.status === "success" && /* @__PURE__ */ jsx20("svg", { className: "w-5 h-5 text-green-500", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx20("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }),
          file.status === "uploading" && /* @__PURE__ */ jsx20("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" }),
          file.status === "error" && onRetry && /* @__PURE__ */ jsx20(
            "button",
            {
              type: "button",
              onClick: onRetry,
              className: "text-xs text-blue-600 hover:text-blue-800 font-medium",
              children: retryText
            }
          ),
          /* @__PURE__ */ jsx20(
            "button",
            {
              type: "button",
              onClick: onRemove2,
              className: "text-gray-400 hover:text-red-600",
              disabled,
              children: /* @__PURE__ */ jsx20("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx20("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
            }
          )
        ] })
      ]
    }
  );
  return /* @__PURE__ */ jsxs19("div", { className: clsx6("w-full", className), children: [
    label && /* @__PURE__ */ jsx20("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: label }),
    description && /* @__PURE__ */ jsx20("p", { className: "text-sm text-gray-500 mb-3", children: description }),
    canAddMore && /* @__PURE__ */ jsxs19(
      "div",
      {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onClick: handleBrowseClick,
        className: clsx6(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragOver && !disabled && "border-blue-500 bg-blue-50",
          !isDragOver && !disabled && "border-gray-300 hover:border-gray-400",
          disabled && "border-gray-200 bg-gray-50 cursor-not-allowed",
          error && "border-red-300",
          dropzoneClassName
        ),
        children: [
          /* @__PURE__ */ jsx20(
            "svg",
            {
              className: clsx6(
                "mx-auto h-12 w-12 mb-4",
                disabled ? "text-gray-300" : "text-gray-400"
              ),
              stroke: "currentColor",
              fill: "none",
              viewBox: "0 0 48 48",
              children: /* @__PURE__ */ jsx20(
                "path",
                {
                  d: "M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02",
                  strokeWidth: 2,
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                }
              )
            }
          ),
          /* @__PURE__ */ jsx20("div", { className: "text-sm text-gray-600", children: dragAndDrop && !disabled ? /* @__PURE__ */ jsxs19(Fragment2, { children: [
            /* @__PURE__ */ jsxs19("span", { children: [
              dragText,
              " "
            ] }),
            /* @__PURE__ */ jsx20("span", { className: "font-medium text-blue-600 hover:text-blue-500", children: browseText })
          ] }) : /* @__PURE__ */ jsx20("span", { className: "font-medium text-blue-600 hover:text-blue-500", children: uploadText }) }),
          accept && /* @__PURE__ */ jsxs19("p", { className: "text-xs text-gray-500 mt-1", children: [
            "Desteklenen formatlar: ",
            accept
          ] }),
          maxSize && /* @__PURE__ */ jsxs19("p", { className: "text-xs text-gray-500 mt-1", children: [
            "Maksimum dosya boyutu: ",
            formatFileSize(maxSize)
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx20(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept,
        multiple,
        onChange: handleFileInputChange,
        className: "hidden",
        disabled
      }
    ),
    value.length > 0 && /* @__PURE__ */ jsx20("div", { className: clsx6("mt-4 space-y-2", fileListClassName), children: value.map((file) => /* @__PURE__ */ jsx20("div", { children: renderFile ? renderFile(file, () => handleRemove(file), () => handleRetry(file)) : defaultRenderFile(file, () => handleRemove(file), () => handleRetry(file)) }, file.id)) }),
    maxFiles && value.length >= maxFiles && /* @__PURE__ */ jsxs19("p", { className: "mt-2 text-sm text-amber-600", children: [
      "Maksimum ",
      maxFiles,
      " dosya y\xFCkleyebilirsiniz"
    ] }),
    error && /* @__PURE__ */ jsx20("p", { className: "mt-1 text-sm text-red-600", children: error }),
    helperText && !error && /* @__PURE__ */ jsx20("p", { className: "mt-1 text-sm text-gray-500", children: helperText })
  ] });
};

// src/components/ui/Pagination.tsx
import { clsx as clsx7 } from "clsx";
import { Fragment as Fragment3, jsx as jsx21, jsxs as jsxs20 } from "react/jsx-runtime";
var defaultItemsPerPageOptions = [10, 25, 50, 100];
var Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showTotalItems = true,
  showPageNumbers = true,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 7,
  itemsPerPageOptions = defaultItemsPerPageOptions,
  disabled = false,
  size = "md",
  className,
  pageButtonClassName,
  activePageClassName,
  disabledClassName,
  previousText = "\xD6nceki",
  nextText = "Sonraki",
  firstText = "\u0130lk",
  lastText = "Son",
  itemsPerPageText = "Sayfa ba\u015F\u0131na:",
  totalItemsText = "toplam",
  pageText = "Sayfa",
  ofText = "/"
}) => {
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };
  const visiblePages = getVisiblePages();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const sizeClasses5 = {
    sm: {
      button: "px-2 py-1 text-xs",
      select: "text-xs px-2 py-1",
      text: "text-xs"
    },
    md: {
      button: "px-3 py-2 text-sm",
      select: "text-sm px-3 py-2",
      text: "text-sm"
    },
    lg: {
      button: "px-4 py-2 text-base",
      select: "text-base px-4 py-2",
      text: "text-base"
    }
  };
  const currentSizeClasses = sizeClasses5[size];
  const baseButtonClasses = clsx7(
    "border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    "transition-colors duration-200 font-medium",
    currentSizeClasses.button,
    disabled && "opacity-50 cursor-not-allowed hover:bg-white"
  );
  const handlePageChange = (page) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };
  const handleItemsPerPageChange = (newItemsPerPage) => {
    if (disabled || !onItemsPerPageChange)
      return;
    onItemsPerPageChange(newItemsPerPage);
  };
  const startItem = totalItems ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;
  return /* @__PURE__ */ jsxs20("div", { className: clsx7("flex flex-col sm:flex-row items-center justify-between gap-4", className), children: [
    showItemsPerPage && onItemsPerPageChange && /* @__PURE__ */ jsxs20("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx21("span", { className: clsx7("text-gray-700", currentSizeClasses.text), children: itemsPerPageText }),
      /* @__PURE__ */ jsx21(
        "select",
        {
          value: itemsPerPage,
          onChange: (e) => handleItemsPerPageChange(Number(e.target.value)),
          disabled,
          className: clsx7(
            "border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            currentSizeClasses.select,
            disabled && "opacity-50 cursor-not-allowed"
          ),
          children: itemsPerPageOptions.map((option) => /* @__PURE__ */ jsx21("option", { value: option, children: option }, option))
        }
      )
    ] }),
    /* @__PURE__ */ jsxs20("div", { className: "flex items-center gap-1", children: [
      showFirstLast && totalPages > maxVisiblePages && /* @__PURE__ */ jsx21(
        "button",
        {
          onClick: () => handlePageChange(1),
          disabled: disabled || isFirstPage,
          className: clsx7(
            baseButtonClasses,
            "rounded-l-md",
            isFirstPage && (disabledClassName || "opacity-50 cursor-not-allowed"),
            pageButtonClassName
          ),
          "aria-label": firstText,
          children: firstText
        }
      ),
      showPrevNext && /* @__PURE__ */ jsxs20(
        "button",
        {
          onClick: () => handlePageChange(currentPage - 1),
          disabled: disabled || isFirstPage,
          className: clsx7(
            baseButtonClasses,
            !showFirstLast && "rounded-l-md",
            isFirstPage && (disabledClassName || "opacity-50 cursor-not-allowed"),
            pageButtonClassName
          ),
          "aria-label": previousText,
          children: [
            /* @__PURE__ */ jsx21("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx21("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }) }),
            /* @__PURE__ */ jsx21("span", { className: "ml-1 hidden sm:inline", children: previousText })
          ]
        }
      ),
      showPageNumbers && /* @__PURE__ */ jsxs20(Fragment3, { children: [
        visiblePages[0] > 1 && /* @__PURE__ */ jsxs20(Fragment3, { children: [
          /* @__PURE__ */ jsx21(
            "button",
            {
              onClick: () => handlePageChange(1),
              disabled,
              className: clsx7(baseButtonClasses, pageButtonClassName),
              children: "1"
            }
          ),
          visiblePages[0] > 2 && /* @__PURE__ */ jsx21("span", { className: clsx7("px-2", currentSizeClasses.text, "text-gray-500"), children: "..." })
        ] }),
        visiblePages.map((page) => /* @__PURE__ */ jsx21(
          "button",
          {
            onClick: () => handlePageChange(page),
            disabled,
            className: clsx7(
              baseButtonClasses,
              page === currentPage && (activePageClassName || "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"),
              pageButtonClassName
            ),
            "aria-current": page === currentPage ? "page" : void 0,
            children: page
          },
          page
        )),
        visiblePages[visiblePages.length - 1] < totalPages && /* @__PURE__ */ jsxs20(Fragment3, { children: [
          visiblePages[visiblePages.length - 1] < totalPages - 1 && /* @__PURE__ */ jsx21("span", { className: clsx7("px-2", currentSizeClasses.text, "text-gray-500"), children: "..." }),
          /* @__PURE__ */ jsx21(
            "button",
            {
              onClick: () => handlePageChange(totalPages),
              disabled,
              className: clsx7(baseButtonClasses, pageButtonClassName),
              children: totalPages
            }
          )
        ] })
      ] }),
      showPrevNext && /* @__PURE__ */ jsxs20(
        "button",
        {
          onClick: () => handlePageChange(currentPage + 1),
          disabled: disabled || isLastPage,
          className: clsx7(
            baseButtonClasses,
            !showFirstLast && "rounded-r-md",
            isLastPage && (disabledClassName || "opacity-50 cursor-not-allowed"),
            pageButtonClassName
          ),
          "aria-label": nextText,
          children: [
            /* @__PURE__ */ jsx21("span", { className: "mr-1 hidden sm:inline", children: nextText }),
            /* @__PURE__ */ jsx21("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx21("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }) })
          ]
        }
      ),
      showFirstLast && totalPages > maxVisiblePages && /* @__PURE__ */ jsx21(
        "button",
        {
          onClick: () => handlePageChange(totalPages),
          disabled: disabled || isLastPage,
          className: clsx7(
            baseButtonClasses,
            "rounded-r-md",
            isLastPage && (disabledClassName || "opacity-50 cursor-not-allowed"),
            pageButtonClassName
          ),
          "aria-label": lastText,
          children: lastText
        }
      )
    ] }),
    showTotalItems && totalItems && /* @__PURE__ */ jsxs20("div", { className: clsx7("text-gray-700", currentSizeClasses.text), children: [
      startItem,
      "-",
      endItem,
      " ",
      ofText,
      " ",
      totalItems,
      " ",
      totalItemsText
    ] })
  ] });
};
var SimplePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className
}) => {
  return /* @__PURE__ */ jsx21(
    Pagination,
    {
      currentPage,
      totalPages,
      onPageChange,
      disabled,
      className,
      showItemsPerPage: false,
      showTotalItems: false,
      showFirstLast: false,
      maxVisiblePages: 5
    }
  );
};

// src/components/ui/Card.tsx
import { jsx as jsx22 } from "react/jsx-runtime";
var cardVariants = {
  default: "bg-white border border-gray-200 rounded-lg shadow-sm",
  outlined: "bg-white border-2 border-gray-300 rounded-lg",
  elevated: "bg-white border border-gray-200 rounded-lg shadow-lg",
  filled: "bg-gray-50 border border-gray-200 rounded-lg"
};
var paddingVariants = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6"
};
var Card = ({
  className = "",
  variant = "default",
  padding = "md",
  children,
  ...props
}) => {
  const classes = [
    cardVariants[variant],
    paddingVariants[padding],
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx22("div", { className: classes, ...props, children });
};
var CardHeader = ({
  className = "",
  children,
  ...props
}) => {
  const classes = ["flex flex-col space-y-1.5 pb-4", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx22("div", { className: classes, ...props, children });
};
var CardTitle = ({
  className = "",
  children,
  ...props
}) => {
  const classes = ["text-lg font-semibold leading-none tracking-tight", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx22("h3", { className: classes, ...props, children });
};
var CardContent = ({
  className = "",
  children,
  ...props
}) => {
  const classes = ["pt-0", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx22("div", { className: classes, ...props, children });
};
var CardFooter = ({
  className = "",
  children,
  ...props
}) => {
  const classes = ["flex items-center pt-4", className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx22("div", { className: classes, ...props, children });
};

// src/components/ui/Alert.tsx
import { AlertCircle as AlertCircle6, CheckCircle as CheckCircle2, Info as Info2, XCircle } from "lucide-react";
import { jsx as jsx23, jsxs as jsxs21 } from "react/jsx-runtime";
var alertVariants = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  success: "bg-green-50 border-green-200 text-green-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  error: "bg-red-50 border-red-200 text-red-800"
};
var iconMap = {
  info: Info2,
  success: CheckCircle2,
  warning: AlertCircle6,
  error: XCircle
};
var Alert = ({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
  ...props
}) => {
  const Icon = iconMap[variant];
  const classes = [
    "border rounded-lg p-4 flex items-start space-x-3",
    alertVariants[variant],
    className
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs21("div", { className: classes, ...props, children: [
    /* @__PURE__ */ jsx23(Icon, { className: "w-5 h-5 mt-0.5 flex-shrink-0" }),
    /* @__PURE__ */ jsxs21("div", { className: "flex-1", children: [
      title && /* @__PURE__ */ jsx23("h4", { className: "font-medium mb-1", children: title }),
      /* @__PURE__ */ jsx23("div", { className: "text-sm", children })
    ] }),
    onClose && /* @__PURE__ */ jsx23(
      "button",
      {
        onClick: onClose,
        className: "flex-shrink-0 ml-auto text-current opacity-70 hover:opacity-100",
        "aria-label": "Close alert",
        children: /* @__PURE__ */ jsx23(XCircle, { className: "w-4 h-4" })
      }
    )
  ] });
};

// src/components/ui/Tooltip.tsx
import { useState as useState12 } from "react";
import { jsx as jsx24, jsxs as jsxs22 } from "react/jsx-runtime";
var positionClasses = {
  top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
  left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
  right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
};
var Tooltip = ({
  content,
  position = "top",
  children,
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState12(false);
  return /* @__PURE__ */ jsxs22(
    "div",
    {
      className: `relative inline-block ${className}`,
      onMouseEnter: () => setIsVisible(true),
      onMouseLeave: () => setIsVisible(false),
      children: [
        children,
        isVisible && /* @__PURE__ */ jsxs22(
          "div",
          {
            className: `absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg whitespace-nowrap ${positionClasses[position]}`,
            children: [
              content,
              /* @__PURE__ */ jsx24(
                "div",
                {
                  className: `absolute w-2 h-2 bg-gray-900 transform rotate-45 ${position === "top" ? "top-full left-1/2 -translate-x-1/2 -mt-1" : position === "bottom" ? "bottom-full left-1/2 -translate-x-1/2 -mb-1" : position === "left" ? "left-full top-1/2 -translate-y-1/2 -ml-1" : "right-full top-1/2 -translate-y-1/2 -mr-1"}`
                }
              )
            ]
          }
        )
      ]
    }
  );
};

// src/components/ui/Dropdown.tsx
import { useState as useState13, useRef as useRef6, useEffect as useEffect8 } from "react";
import { jsx as jsx25, jsxs as jsxs23 } from "react/jsx-runtime";
var positionClasses2 = {
  "bottom-left": "top-full left-0 mt-1",
  "bottom-right": "top-full right-0 mt-1",
  "top-left": "bottom-full left-0 mb-1",
  "top-right": "bottom-full right-0 mb-1"
};
var Dropdown = ({
  trigger,
  items,
  position = "bottom-left",
  className = "",
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState13(false);
  const dropdownRef = useRef6(null);
  useEffect8(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const handleItemClick = (item) => {
    if (!item.disabled) {
      item.onClick?.();
      onSelect?.(item);
      setIsOpen(false);
    }
  };
  return /* @__PURE__ */ jsxs23("div", { ref: dropdownRef, className: `relative inline-block ${className}`, children: [
    /* @__PURE__ */ jsx25("div", { onClick: () => setIsOpen(!isOpen), className: "cursor-pointer", children: trigger }),
    isOpen && /* @__PURE__ */ jsx25(
      "div",
      {
        className: `absolute z-50 min-w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 ${positionClasses2[position]}`,
        children: items.map((item, index) => /* @__PURE__ */ jsx25(
          "button",
          {
            onClick: () => handleItemClick(item),
            disabled: item.disabled,
            className: `w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${item.disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700"}`,
            children: item.label
          },
          index
        ))
      }
    )
  ] });
};

// src/components/forms/DynamicForm.tsx
import { useState as useState14, useEffect as useEffect9, useCallback as useCallback5 } from "react";
import { ChevronDown as ChevronDown4, AlertCircle as AlertCircle7, Check as Check3 } from "lucide-react";
import { Fragment as Fragment4, jsx as jsx26, jsxs as jsxs24 } from "react/jsx-runtime";
var DynamicForm = ({
  fields = [],
  sections = [],
  initialData = {},
  onSubmit,
  onCancel,
  onReset,
  onFieldChange,
  submitText = "Kaydet",
  cancelText = "\u0130ptal",
  resetText = "S\u0131f\u0131rla",
  loading = false,
  disabled = false,
  showActions = true,
  actionPosition = "bottom",
  className = "",
  validateOnChange = false,
  validateOnBlur = true
}) => {
  const [formData, setFormData] = useState14(initialData);
  const [errors, setErrors] = useState14({});
  const [touched, setTouched] = useState14({});
  const [collapsedSections, setCollapsedSections] = useState14({});
  useEffect9(() => {
    const initialCollapsed = {};
    sections.forEach((section) => {
      if (section.collapsible && section.defaultCollapsed) {
        initialCollapsed[section.title] = true;
      }
    });
    setCollapsedSections(initialCollapsed);
  }, [sections]);
  useEffect9(() => {
    setFormData(initialData);
  }, [initialData]);
  const getAllFields = useCallback5(() => {
    if (sections.length > 0) {
      return sections.flatMap((section) => section.fields);
    }
    return fields;
  }, [fields, sections]);
  const validateField = useCallback5((field, value) => {
    if (field.required && (value === void 0 || value === null || value === "")) {
      return `${field.label} alan\u0131 zorunludur`;
    }
    if (field.validation) {
      const { min, max, minLength, maxLength, pattern, custom } = field.validation;
      if (typeof value === "string") {
        if (minLength && value.length < minLength) {
          return `${field.label} en az ${minLength} karakter olmal\u0131d\u0131r`;
        }
        if (maxLength && value.length > maxLength) {
          return `${field.label} en fazla ${maxLength} karakter olmal\u0131d\u0131r`;
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          return `${field.label} ge\xE7erli bir format de\u011Fil`;
        }
      }
      if (typeof value === "number") {
        if (min !== void 0 && value < min) {
          return `${field.label} en az ${min} olmal\u0131d\u0131r`;
        }
        if (max !== void 0 && value > max) {
          return `${field.label} en fazla ${max} olmal\u0131d\u0131r`;
        }
      }
      if (custom) {
        const customError = custom(value);
        if (customError)
          return customError;
      }
    }
    return null;
  }, []);
  const validateForm = useCallback5(() => {
    const newErrors = {};
    const allFields = getAllFields();
    allFields.forEach((field) => {
      if (field.hidden || field.showWhen && !field.showWhen(formData)) {
        return;
      }
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });
    return newErrors;
  }, [formData, getAllFields, validateField]);
  const handleFieldChange = (field, value) => {
    const newFormData = { ...formData, [field.name]: value };
    setFormData(newFormData);
    if (validateOnChange) {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field.name]: error || ""
      }));
    }
    onFieldChange?.(field.name, value, newFormData);
  };
  const handleFieldBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field.name]: true }));
    if (validateOnBlur) {
      const error = validateField(field, formData[field.name]);
      setErrors((prev) => ({
        ...prev,
        [field.name]: error || ""
      }));
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    setErrors(formErrors);
    if (Object.keys(formErrors).length === 0) {
      await onSubmit(formData);
    }
  };
  const handleReset = () => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
    onReset?.();
  };
  const toggleSection = (sectionTitle) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };
  const renderField = (field) => {
    if (field.hidden || field.showWhen && !field.showWhen(formData)) {
      return null;
    }
    const value = formData[field.name] ?? field.defaultValue ?? "";
    const error = errors[field.name];
    const isTouched = touched[field.name];
    const showError = error && isTouched;
    const baseInputClasses = `
      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      ${showError ? "border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"}
      ${field.disabled || disabled ? "opacity-50 cursor-not-allowed" : ""}
      text-gray-900 dark:text-gray-100
      ${field.className || ""}
    `;
    const renderInput = () => {
      switch (field.type) {
        case "textarea":
          return /* @__PURE__ */ jsx26(
            "textarea",
            {
              id: field.name,
              name: field.name,
              value,
              onChange: (e) => handleFieldChange(field, e.target.value),
              onBlur: () => handleFieldBlur(field),
              placeholder: field.placeholder,
              disabled: field.disabled || disabled,
              required: field.required,
              rows: field.rows || 3,
              className: baseInputClasses
            }
          );
        case "select":
          return /* @__PURE__ */ jsxs24("div", { className: "relative", children: [
            /* @__PURE__ */ jsxs24(
              "select",
              {
                id: field.name,
                name: field.name,
                value,
                onChange: (e) => handleFieldChange(field, e.target.value),
                onBlur: () => handleFieldBlur(field),
                disabled: field.disabled || disabled,
                required: field.required,
                className: `${baseInputClasses} pr-10 appearance-none`,
                children: [
                  /* @__PURE__ */ jsx26("option", { value: "", children: field.placeholder || "Se\xE7iniz..." }),
                  field.options?.map((option) => /* @__PURE__ */ jsx26("option", { value: option.value, children: option.label }, option.value))
                ]
              }
            ),
            /* @__PURE__ */ jsx26(ChevronDown4, { className: "absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" })
          ] });
        case "multiselect":
          return /* @__PURE__ */ jsx26("div", { className: "space-y-2", children: field.options?.map((option) => /* @__PURE__ */ jsxs24("label", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx26(
              "input",
              {
                type: "checkbox",
                checked: Array.isArray(value) ? value.includes(option.value) : false,
                onChange: (e) => {
                  const currentValues = Array.isArray(value) ? value : [];
                  const newValues = e.target.checked ? [...currentValues, option.value] : currentValues.filter((v) => v !== option.value);
                  handleFieldChange(field, newValues);
                },
                disabled: field.disabled || disabled,
                className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              }
            ),
            /* @__PURE__ */ jsx26("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: option.label })
          ] }, option.value)) });
        case "radio":
          return /* @__PURE__ */ jsx26("div", { className: "space-y-2", children: field.options?.map((option) => /* @__PURE__ */ jsxs24("label", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx26(
              "input",
              {
                type: "radio",
                name: field.name,
                value: option.value,
                checked: value === option.value,
                onChange: (e) => handleFieldChange(field, e.target.value),
                onBlur: () => handleFieldBlur(field),
                disabled: field.disabled || disabled,
                className: "border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              }
            ),
            /* @__PURE__ */ jsx26("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: option.label })
          ] }, option.value)) });
        case "checkbox":
          return /* @__PURE__ */ jsxs24("label", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx26(
              "input",
              {
                type: "checkbox",
                checked: !!value,
                onChange: (e) => handleFieldChange(field, e.target.checked),
                onBlur: () => handleFieldBlur(field),
                disabled: field.disabled || disabled,
                className: "rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              }
            ),
            /* @__PURE__ */ jsx26("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: field.label })
          ] });
        case "file":
          return /* @__PURE__ */ jsx26(
            "input",
            {
              type: "file",
              id: field.name,
              name: field.name,
              onChange: (e) => handleFieldChange(field, e.target.files?.[0] || null),
              onBlur: () => handleFieldBlur(field),
              disabled: field.disabled || disabled,
              required: field.required,
              multiple: field.multiple,
              accept: field.accept,
              className: baseInputClasses
            }
          );
        case "number":
          return /* @__PURE__ */ jsx26(
            "input",
            {
              type: "number",
              id: field.name,
              name: field.name,
              value,
              onChange: (e) => handleFieldChange(field, e.target.valueAsNumber || ""),
              onBlur: () => handleFieldBlur(field),
              placeholder: field.placeholder,
              disabled: field.disabled || disabled,
              required: field.required,
              min: field.validation?.min,
              max: field.validation?.max,
              step: field.step,
              className: baseInputClasses
            }
          );
        default:
          return /* @__PURE__ */ jsx26(
            "input",
            {
              type: field.type,
              id: field.name,
              name: field.name,
              value,
              onChange: (e) => handleFieldChange(field, e.target.value),
              onBlur: () => handleFieldBlur(field),
              placeholder: field.placeholder,
              disabled: field.disabled || disabled,
              required: field.required,
              minLength: field.validation?.minLength,
              maxLength: field.validation?.maxLength,
              pattern: field.validation?.pattern,
              className: baseInputClasses
            }
          );
      }
    };
    return /* @__PURE__ */ jsxs24("div", { className: "space-y-1", children: [
      field.type !== "checkbox" && /* @__PURE__ */ jsxs24("label", { htmlFor: field.name, className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: [
        field.label,
        field.required && /* @__PURE__ */ jsx26("span", { className: "text-red-500 ml-1", children: "*" })
      ] }),
      renderInput(),
      field.description && /* @__PURE__ */ jsx26("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: field.description }),
      showError && /* @__PURE__ */ jsxs24("div", { className: "flex items-center text-sm text-red-600 dark:text-red-400", children: [
        /* @__PURE__ */ jsx26(AlertCircle7, { className: "w-4 h-4 mr-1" }),
        error
      ] })
    ] }, field.name);
  };
  const renderActions = () => {
    if (!showActions)
      return null;
    return /* @__PURE__ */ jsxs24("div", { className: "flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700", children: [
      onReset && /* @__PURE__ */ jsx26(
        "button",
        {
          type: "button",
          onClick: handleReset,
          disabled: loading || disabled,
          className: "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
          children: resetText
        }
      ),
      onCancel && /* @__PURE__ */ jsx26(
        "button",
        {
          type: "button",
          onClick: onCancel,
          disabled: loading || disabled,
          className: "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
          children: cancelText
        }
      ),
      /* @__PURE__ */ jsx26(
        "button",
        {
          type: "submit",
          disabled: loading || disabled,
          className: "inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
          children: loading ? /* @__PURE__ */ jsxs24(Fragment4, { children: [
            /* @__PURE__ */ jsx26("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" }),
            "Kaydediliyor..."
          ] }) : /* @__PURE__ */ jsxs24(Fragment4, { children: [
            /* @__PURE__ */ jsx26(Check3, { className: "w-4 h-4 mr-2" }),
            submitText
          ] })
        }
      )
    ] });
  };
  const renderSection = (section) => {
    const isCollapsed = collapsedSections[section.title];
    return /* @__PURE__ */ jsxs24("div", { className: "border border-gray-200 dark:border-gray-700 rounded-lg", children: [
      /* @__PURE__ */ jsx26(
        "div",
        {
          className: `px-4 py-3 bg-gray-50 dark:bg-gray-700 ${section.collapsible ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" : ""}`,
          onClick: section.collapsible ? () => toggleSection(section.title) : void 0,
          children: /* @__PURE__ */ jsxs24("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs24("div", { children: [
              /* @__PURE__ */ jsx26("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: section.title }),
              section.description && /* @__PURE__ */ jsx26("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1", children: section.description })
            ] }),
            section.collapsible && /* @__PURE__ */ jsx26(
              ChevronDown4,
              {
                className: `w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`
              }
            )
          ] })
        }
      ),
      (!section.collapsible || !isCollapsed) && /* @__PURE__ */ jsx26("div", { className: "p-4 space-y-4", children: section.fields.map(renderField) })
    ] }, section.title);
  };
  return /* @__PURE__ */ jsxs24("form", { onSubmit: handleSubmit, className: `space-y-6 ${className}`, children: [
    actionPosition === "top" && renderActions(),
    sections.length > 0 ? /* @__PURE__ */ jsx26("div", { className: "space-y-6", children: sections.map(renderSection) }) : /* @__PURE__ */ jsx26("div", { className: "space-y-4", children: fields.map(renderField) }),
    (actionPosition === "bottom" || actionPosition === "both") && renderActions()
  ] });
};

// src/pages/ComponentsDemo.tsx
import { useState as useState15 } from "react";
import {
  Users as Users2,
  Package as Package2,
  Calendar as Calendar3,
  TrendingUp as TrendingUp2,
  Edit,
  Trash2,
  Eye,
  Plus as Plus2,
  Settings as Settings3
} from "lucide-react";
import { jsx as jsx27, jsxs as jsxs25 } from "react/jsx-runtime";
var samplePatients = [
  { id: 1, name: "Ahmet Y\u0131lmaz", phone: "0532 123 4567", email: "ahmet@example.com", status: "Aktif", lastVisit: "2024-01-15" },
  { id: 2, name: "Fatma Kaya", phone: "0533 234 5678", email: "fatma@example.com", status: "Beklemede", lastVisit: "2024-01-10" },
  { id: 3, name: "Mehmet Demir", phone: "0534 345 6789", email: "mehmet@example.com", status: "Aktif", lastVisit: "2024-01-12" },
  { id: 4, name: "Ay\u015Fe \u015Eahin", phone: "0535 456 7890", email: "ayse@example.com", status: "Pasif", lastVisit: "2023-12-20" },
  { id: 5, name: "Ali \xD6zkan", phone: "0536 567 8901", email: "ali@example.com", status: "Aktif", lastVisit: "2024-01-14" }
];
var ComponentsDemo = () => {
  const [sidebarOpen, setSidebarOpen] = useState15(false);
  const [selectedPatients, setSelectedPatients] = useState15([]);
  const [currentPage, setCurrentPage] = useState15(1);
  const [pageSize, setPageSize] = useState15(10);
  const { isOpen: isModalOpen, openModal, closeModal } = useModal();
  const { isOpen: isFormModalOpen, openModal: openFormModal, closeModal: closeFormModal } = useModal();
  const user = {
    name: "Dr. \xD6rnek Kullan\u0131c\u0131",
    email: "ornek@xear.com",
    avatar: "https://ui-avatars.com/api/?name=Dr+\xD6rnek+Kullan\u0131c\u0131&background=3b82f6&color=fff"
  };
  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: /* @__PURE__ */ jsx27(TrendingUp2, { className: "w-5 h-5" }), path: "/dashboard" },
    { id: "patients", label: "Hastalar", icon: /* @__PURE__ */ jsx27(Users2, { className: "w-5 h-5" }), path: "/patients" },
    { id: "appointments", label: "Randevular", icon: /* @__PURE__ */ jsx27(Calendar3, { className: "w-5 h-5" }), path: "/appointments" },
    { id: "inventory", label: "Envanter", icon: /* @__PURE__ */ jsx27(Package2, { className: "w-5 h-5" }), path: "/inventory" },
    { id: "settings", label: "Ayarlar", icon: /* @__PURE__ */ jsx27(Settings3, { className: "w-5 h-5" }), path: "/settings" }
  ];
  const columns = [
    {
      key: "name",
      title: "Hasta Ad\u0131",
      sortable: true,
      render: (value, record) => /* @__PURE__ */ jsxs25("div", { className: "flex items-center", children: [
        /* @__PURE__ */ jsx27("div", { className: "w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3", children: /* @__PURE__ */ jsx27("span", { className: "text-blue-600 font-medium text-sm", children: value.split(" ").map((n) => n[0]).join("") }) }),
        /* @__PURE__ */ jsxs25("div", { children: [
          /* @__PURE__ */ jsx27("div", { className: "font-medium text-gray-900 dark:text-gray-100", children: value }),
          /* @__PURE__ */ jsx27("div", { className: "text-sm text-gray-500", children: record.email })
        ] })
      ] })
    },
    {
      key: "phone",
      title: "Telefon",
      sortable: true
    },
    {
      key: "status",
      title: "Durum",
      sortable: true,
      render: (value) => /* @__PURE__ */ jsx27("span", { className: `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${value === "Aktif" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : value === "Beklemede" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`, children: value })
    },
    {
      key: "lastVisit",
      title: "Son Ziyaret",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString("tr-TR")
    }
  ];
  const actions = [
    {
      key: "view",
      label: "G\xF6r\xFCnt\xFCle",
      icon: /* @__PURE__ */ jsx27(Eye, { className: "w-4 h-4" }),
      onClick: (record) => console.log("Viewing:", record),
      variant: "secondary"
    },
    {
      key: "edit",
      label: "D\xFCzenle",
      icon: /* @__PURE__ */ jsx27(Edit, { className: "w-4 h-4" }),
      onClick: (record) => console.log("Editing:", record),
      variant: "primary"
    },
    {
      key: "delete",
      label: "Sil",
      icon: /* @__PURE__ */ jsx27(Trash2, { className: "w-4 h-4" }),
      onClick: (record) => console.log("Deleting:", record),
      variant: "danger"
    }
  ];
  const bulkActions = [
    {
      key: "activate",
      label: "Aktifle\u015Ftir",
      icon: /* @__PURE__ */ jsx27(Plus2, { className: "w-4 h-4" }),
      onClick: (records) => console.log("Activating:", records),
      variant: "primary"
    },
    {
      key: "delete",
      label: "Toplu Sil",
      icon: /* @__PURE__ */ jsx27(Trash2, { className: "w-4 h-4" }),
      onClick: (records) => console.log("Bulk deleting:", records),
      variant: "danger"
    }
  ];
  const formFields = [
    {
      name: "firstName",
      label: "Ad",
      type: "text",
      required: true,
      placeholder: "Ad\u0131n\u0131z\u0131 girin"
    },
    {
      name: "lastName",
      label: "Soyad",
      type: "text",
      required: true,
      placeholder: "Soyad\u0131n\u0131z\u0131 girin"
    },
    {
      name: "email",
      label: "E-posta",
      type: "email",
      required: true,
      placeholder: "ornek@email.com",
      validation: {
        pattern: "^[^@]+@[^@]+\\.[^@]+$"
      }
    },
    {
      name: "phone",
      label: "Telefon",
      type: "tel",
      placeholder: "0532 123 4567"
    },
    {
      name: "birthDate",
      label: "Do\u011Fum Tarihi",
      type: "date"
    },
    {
      name: "gender",
      label: "Cinsiyet",
      type: "select",
      options: [
        { label: "Erkek", value: "male" },
        { label: "Kad\u0131n", value: "female" },
        { label: "Belirtmek istemiyorum", value: "other" }
      ]
    },
    {
      name: "notes",
      label: "Notlar",
      type: "textarea",
      rows: 3,
      placeholder: "Ek notlar..."
    },
    {
      name: "newsletter",
      label: "E-posta b\xFCltenine abone ol",
      type: "checkbox"
    }
  ];
  const formSections = [
    {
      title: "Ki\u015Fisel Bilgiler",
      description: "Temel ki\u015Fisel bilgilerinizi girin",
      fields: formFields.slice(0, 5)
    },
    {
      title: "\u0130leti\u015Fim Tercihleri",
      description: "\u0130leti\u015Fim ve tercih ayarlar\u0131n\u0131z",
      fields: formFields.slice(5),
      collapsible: true
    }
  ];
  const handleFormSubmit = (data) => {
    console.log("Form submitted:", data);
    closeFormModal();
  };
  const patientStats = createPatientStats();
  const inventoryStats = createInventoryStats();
  patientStats[0].value = samplePatients.length.toString();
  patientStats[1].value = samplePatients.filter((p) => p.status === "Aktif").length.toString();
  patientStats[2].value = samplePatients.filter((p) => p.status === "Beklemede").length.toString();
  patientStats[3].value = "2";
  return /* @__PURE__ */ jsx27(
    Layout_default,
    {
      user,
      currentPath: "/demo",
      children: /* @__PURE__ */ jsxs25("div", { className: "p-6 space-y-8", children: [
        /* @__PURE__ */ jsxs25("div", { children: [
          /* @__PURE__ */ jsx27("h1", { className: "text-3xl font-bold text-gray-900 dark:text-gray-100", children: "UI Bile\u015Fenleri Demo" }),
          /* @__PURE__ */ jsx27("p", { className: "text-gray-600 dark:text-gray-400 mt-2", children: "X-Ear uygulamas\u0131 i\xE7in olu\u015Fturulan modern React bile\u015Fenlerinin demo sayfas\u0131" })
        ] }),
        /* @__PURE__ */ jsxs25("section", { children: [
          /* @__PURE__ */ jsx27("h2", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4", children: "\u0130statistik Kartlar\u0131" }),
          /* @__PURE__ */ jsx27("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6", children: patientStats.map((stat, index) => /* @__PURE__ */ jsx27(
            StatsCard,
            {
              ...stat,
              trend: index === 0 ? { value: "+12%", direction: "up", period: "Bu ay" } : void 0,
              clickable: true,
              onClick: () => console.log(`Clicked stat: ${stat.title}`)
            },
            index
          )) }),
          /* @__PURE__ */ jsx27("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: inventoryStats.map((stat, index) => /* @__PURE__ */ jsx27(
            StatsCard,
            {
              ...stat,
              trend: index === 2 ? { value: "\u20BA15,420", direction: "up", period: "Bu ay" } : void 0
            },
            index
          )) })
        ] }),
        /* @__PURE__ */ jsxs25("section", { children: [
          /* @__PURE__ */ jsx27("h2", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4", children: "Modal Bile\u015Fenleri" }),
          /* @__PURE__ */ jsxs25("div", { className: "flex space-x-4", children: [
            /* @__PURE__ */ jsx27(
              "button",
              {
                onClick: openModal,
                className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                children: "Basit Modal A\xE7"
              }
            ),
            /* @__PURE__ */ jsx27(
              "button",
              {
                onClick: openFormModal,
                className: "px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500",
                children: "Form Modal A\xE7"
              }
            )
          ] }),
          /* @__PURE__ */ jsx27(
            Modal,
            {
              isOpen: isModalOpen,
              onClose: closeModal,
              onSave: () => {
                console.log("Modal saved");
                closeModal();
              },
              title: "\xD6rnek Modal",
              size: "md",
              children: /* @__PURE__ */ jsx27("div", { className: "p-4", children: /* @__PURE__ */ jsx27("p", { className: "text-gray-600 dark:text-gray-400", children: "Bu bir \xF6rnek modal i\xE7eri\u011Fidir. Modal bile\u015Feni farkl\u0131 boyutlarda, \xF6zelle\u015Ftirilebilir footer'lar ile kullan\u0131labilir." }) })
            }
          ),
          /* @__PURE__ */ jsx27(
            Modal,
            {
              isOpen: isFormModalOpen,
              onClose: closeFormModal,
              title: "Hasta Bilgileri",
              size: "lg",
              showFooter: false,
              children: /* @__PURE__ */ jsx27("div", { className: "p-4", children: /* @__PURE__ */ jsx27(
                DynamicForm,
                {
                  sections: formSections,
                  onSubmit: handleFormSubmit,
                  onCancel: closeFormModal,
                  submitText: "Hasta Kaydet",
                  cancelText: "\u0130ptal"
                }
              ) })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs25("section", { children: [
          /* @__PURE__ */ jsx27("h2", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4", children: "Veri Tablosu" }),
          /* @__PURE__ */ jsx27(
            DataTable,
            {
              data: samplePatients,
              columns,
              actions,
              bulkActions,
              searchable: true,
              sortable: true,
              rowSelection: {
                selectedRowKeys: selectedPatients,
                onChange: (keys, rows) => {
                  setSelectedPatients(keys);
                  console.log("Selected patients:", rows);
                }
              },
              pagination: {
                current: currentPage,
                pageSize,
                total: samplePatients.length,
                showSizeChanger: true,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || pageSize);
                }
              },
              onSearch: (value) => console.log("Search:", value),
              onSort: (key, direction) => console.log("Sort:", key, direction),
              hoverable: true,
              striped: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxs25("section", { children: [
          /* @__PURE__ */ jsx27("h2", { className: "text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4", children: "Dinamik Form" }),
          /* @__PURE__ */ jsx27("div", { className: "bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsx27(
            DynamicForm,
            {
              fields: formFields,
              onSubmit: (data) => console.log("Form data:", data),
              onReset: () => console.log("Form reset"),
              submitText: "Kaydet",
              resetText: "Temizle",
              validateOnChange: true
            }
          ) })
        ] })
      ] })
    }
  );
};
var ComponentsDemo_default = ComponentsDemo;

// src/pages/InventoryPage.tsx
import { useState as useState16, useEffect as useEffect10, useMemo as useMemo2 } from "react";
import {
  Search as Search3,
  Plus as Plus3,
  Upload,
  Download,
  MoreHorizontal as MoreHorizontal2,
  Package as Package3,
  AlertTriangle as AlertTriangle2,
  DollarSign as DollarSign2,
  TrendingUp as TrendingUp3,
  Edit as Edit2,
  Trash2 as Trash22,
  Eye as Eye2
} from "lucide-react";
import { jsx as jsx28, jsxs as jsxs26 } from "react/jsx-runtime";
var sampleInventoryData = [
  {
    id: "1",
    productName: "Wireless Headphones",
    brand: "TechBrand",
    model: "WH-1000XM4",
    category: "Electronics",
    stock: 25,
    minStock: 10,
    unitPrice: 299.99,
    vatIncludedPrice: 353.99,
    totalValue: 8849.75,
    barcode: "1234567890123",
    supplier: "Tech Supplier Inc.",
    warrantyPeriod: "2 years",
    status: "active",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-20T14:45:00Z"
  },
  {
    id: "2",
    productName: "Bluetooth Speaker",
    brand: "AudioMax",
    model: "BT-500",
    category: "Electronics",
    stock: 5,
    minStock: 15,
    unitPrice: 89.99,
    vatIncludedPrice: 106.19,
    totalValue: 530.95,
    barcode: "2345678901234",
    supplier: "Audio Solutions Ltd.",
    warrantyPeriod: "1 year",
    status: "active",
    createdAt: "2024-01-10T09:15:00Z",
    updatedAt: "2024-01-18T16:20:00Z"
  }
];
var categories = ["All", "Electronics", "Accessories", "Components", "Tools"];
var brands = ["All", "TechBrand", "AudioMax", "ComponentCorp", "ToolMaster"];
var statusOptions = ["All", "Active", "Inactive", "Discontinued"];
var InventoryPage = () => {
  const [inventoryData, setInventoryData] = useState16(sampleInventoryData);
  const [loading, setLoading] = useState16(false);
  const [filters, setFilters] = useState16({
    search: "",
    category: "All",
    brand: "All",
    status: "All",
    lowStock: false
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState16(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState16(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState16(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState16(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState16(false);
  const [selectedItem, setSelectedItem] = useState16(null);
  const [bulkOperation, setBulkOperation] = useState16("category");
  const [bulkFormData, setBulkFormData] = useState16({
    category: "",
    priceType: "percentage",
    // percentage, fixed, increase, decrease
    priceValue: "",
    stockOperation: "set",
    // set, increase, decrease
    stockValue: "",
    supplier: ""
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState16([]);
  const [pagination, setPagination] = useState16({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [formData, setFormData] = useState16({
    productName: "",
    brand: "",
    model: "",
    category: "",
    stock: 0,
    minStock: 0,
    unitPrice: 0,
    barcode: "",
    supplier: "",
    warrantyPeriod: "",
    status: "active"
  });
  const filteredData = useMemo2(() => {
    let filtered = inventoryData;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) => item.productName.toLowerCase().includes(searchLower) || item.brand.toLowerCase().includes(searchLower) || item.model.toLowerCase().includes(searchLower) || item.barcode?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.category !== "All") {
      filtered = filtered.filter((item) => item.category === filters.category);
    }
    if (filters.brand !== "All") {
      filtered = filtered.filter((item) => item.brand === filters.brand);
    }
    if (filters.status !== "All") {
      filtered = filtered.filter((item) => item.status === filters.status.toLowerCase());
    }
    if (filters.lowStock) {
      filtered = filtered.filter((item) => item.stock <= item.minStock);
    }
    return filtered;
  }, [inventoryData, filters]);
  const stats = useMemo2(() => {
    const totalProducts = inventoryData.length;
    const lowStockCount = inventoryData.filter((item) => item.stock <= item.minStock).length;
    const totalValue = inventoryData.reduce((sum, item) => sum + item.totalValue, 0);
    const activeTrials = inventoryData.filter((item) => item.status === "active").length;
    return {
      totalProducts,
      lowStockCount,
      totalValue,
      activeTrials
    };
  }, [inventoryData]);
  useEffect10(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredData.length
    }));
  }, [filteredData]);
  const columns = [
    {
      key: "productName",
      title: "Product Name",
      sortable: true,
      render: (value, record) => /* @__PURE__ */ jsxs26("div", { className: "flex flex-col", children: [
        /* @__PURE__ */ jsx28("span", { className: "font-medium text-gray-900 dark:text-white", children: value }),
        /* @__PURE__ */ jsxs26("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: [
          record.brand,
          " - ",
          record.model
        ] })
      ] })
    },
    {
      key: "category",
      title: "Category",
      sortable: true,
      render: (value) => /* @__PURE__ */ jsx28(Badge, { variant: "secondary", children: value })
    },
    {
      key: "stock",
      title: "Stock",
      sortable: true,
      render: (value, record) => /* @__PURE__ */ jsxs26("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsx28("span", { className: `font-medium ${value <= record.minStock ? "text-red-600" : "text-gray-900 dark:text-white"}`, children: value }),
        value <= record.minStock && /* @__PURE__ */ jsx28(AlertTriangle2, { className: "w-4 h-4 text-red-500" })
      ] })
    },
    {
      key: "minStock",
      title: "Min Stock",
      sortable: true
    },
    {
      key: "unitPrice",
      title: "Unit Price",
      sortable: true,
      render: (value) => `\u20BA${value.toFixed(2)}`
    },
    {
      key: "vatIncludedPrice",
      title: "VAT Included Price",
      sortable: true,
      render: (value) => `\u20BA${value.toFixed(2)}`
    },
    {
      key: "totalValue",
      title: "Total Value",
      sortable: true,
      render: (value) => `\u20BA${value.toFixed(2)}`
    },
    {
      key: "status",
      title: "Status",
      render: (value) => /* @__PURE__ */ jsx28(
        Badge,
        {
          variant: value === "active" ? "success" : value === "inactive" ? "warning" : "danger",
          children: value.charAt(0).toUpperCase() + value.slice(1)
        }
      )
    }
  ];
  const actions = [
    {
      key: "view",
      label: "View Details",
      icon: /* @__PURE__ */ jsx28(Eye2, { className: "w-4 h-4" }),
      onClick: (record) => {
        setSelectedItem(record);
        setIsDetailsModalOpen(true);
      }
    },
    {
      key: "edit",
      label: "Edit",
      icon: /* @__PURE__ */ jsx28(Edit2, { className: "w-4 h-4" }),
      onClick: (record) => {
        setSelectedItem(record);
        setFormData(record);
        setIsEditModalOpen(true);
      }
    },
    {
      key: "delete",
      label: "Delete",
      icon: /* @__PURE__ */ jsx28(Trash22, { className: "w-4 h-4" }),
      variant: "danger",
      onClick: (record) => {
        if (window.confirm(`Are you sure you want to delete ${record.productName}?`)) {
          setInventoryData((prev) => prev.filter((item) => item.id !== record.id));
        }
      }
    }
  ];
  const bulkActions = [
    {
      key: "bulk-operations",
      label: "Bulk Operations",
      icon: /* @__PURE__ */ jsx28(MoreHorizontal2, { className: "w-4 h-4" }),
      onClick: (selectedRecords) => {
        setIsBulkModalOpen(true);
      }
    },
    {
      key: "delete",
      label: "Delete Selected",
      icon: /* @__PURE__ */ jsx28(Trash22, { className: "w-4 h-4" }),
      variant: "danger",
      onClick: (selectedRecords) => {
        if (window.confirm(`Are you sure you want to delete ${selectedRecords.length} items?`)) {
          const selectedIds = selectedRecords.map((record) => record.id);
          setInventoryData((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
          setSelectedRowKeys([]);
        }
      }
    },
    {
      key: "export",
      label: "Export Selected",
      icon: /* @__PURE__ */ jsx28(Download, { className: "w-4 h-4" }),
      onClick: (selectedRecords) => {
        exportToCSV(selectedRecords);
      }
    }
  ];
  const handleBulkOperation = async () => {
    const selectedRecords = inventoryData.filter((item) => selectedRowKeys.includes(item.id));
    if (selectedRecords.length === 0) {
      alert("Please select items to perform bulk operations");
      return;
    }
    try {
      let updatedData = [...inventoryData];
      switch (bulkOperation) {
        case "category":
          if (!bulkFormData.category) {
            alert("Please select a category");
            return;
          }
          updatedData = updatedData.map(
            (item) => selectedRowKeys.includes(item.id) ? { ...item, category: bulkFormData.category, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } : item
          );
          break;
        case "price":
          if (!bulkFormData.priceValue) {
            alert("Please enter a price value");
            return;
          }
          const priceValue = parseFloat(bulkFormData.priceValue);
          updatedData = updatedData.map((item) => {
            if (!selectedRowKeys.includes(item.id))
              return item;
            let newPrice = item.unitPrice;
            switch (bulkFormData.priceType) {
              case "percentage":
                newPrice = item.unitPrice * (1 + priceValue / 100);
                break;
              case "fixed":
                newPrice = priceValue;
                break;
              case "increase":
                newPrice = item.unitPrice + priceValue;
                break;
              case "decrease":
                newPrice = item.unitPrice - priceValue;
                break;
            }
            const vatIncludedPrice = newPrice * 1.18;
            const totalValue = newPrice * item.stock;
            return {
              ...item,
              unitPrice: Math.max(0, newPrice),
              vatIncludedPrice,
              totalValue,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
          });
          break;
        case "stock":
          if (!bulkFormData.stockValue) {
            alert("Please enter a stock value");
            return;
          }
          const stockValue = parseInt(bulkFormData.stockValue);
          updatedData = updatedData.map((item) => {
            if (!selectedRowKeys.includes(item.id))
              return item;
            let newStock = item.stock;
            switch (bulkFormData.stockOperation) {
              case "set":
                newStock = stockValue;
                break;
              case "increase":
                newStock = item.stock + stockValue;
                break;
              case "decrease":
                newStock = Math.max(0, item.stock - stockValue);
                break;
            }
            const totalValue = item.unitPrice * newStock;
            return {
              ...item,
              stock: newStock,
              totalValue,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
          });
          break;
        case "supplier":
          if (!bulkFormData.supplier) {
            alert("Please enter a supplier name");
            return;
          }
          updatedData = updatedData.map(
            (item) => selectedRowKeys.includes(item.id) ? { ...item, supplier: bulkFormData.supplier, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } : item
          );
          break;
        case "delete":
          if (window.confirm(`Are you sure you want to delete ${selectedRecords.length} items?`)) {
            updatedData = updatedData.filter((item) => !selectedRowKeys.includes(item.id));
          } else {
            return;
          }
          break;
      }
      setInventoryData(updatedData);
      setSelectedRowKeys([]);
      setIsBulkModalOpen(false);
      setBulkFormData({
        category: "",
        priceType: "percentage",
        priceValue: "",
        stockOperation: "set",
        stockValue: "",
        supplier: ""
      });
    } catch (error) {
      console.error("Bulk operation error:", error);
      alert("An error occurred during bulk operation");
    }
  };
  const exportToCSV = (data) => {
    const headers = [
      "ID",
      "Product Name",
      "Brand",
      "Model",
      "Category",
      "Stock",
      "Min Stock",
      "Unit Price",
      "VAT Included Price",
      "Total Value",
      "Barcode",
      "Serial Number",
      "Supplier",
      "Warranty Period",
      "Status",
      "Created At",
      "Updated At"
    ];
    const csvContent = [
      headers.join(","),
      ...data.map((item) => [
        item.id,
        `"${item.productName}"`,
        `"${item.brand}"`,
        `"${item.model}"`,
        `"${item.category}"`,
        item.stock,
        item.minStock,
        item.unitPrice,
        item.vatIncludedPrice,
        item.totalValue,
        `"${item.barcode || ""}"`,
        `"${item.serialNumber || ""}"`,
        `"${item.supplier || ""}"`,
        `"${item.warrantyPeriod || ""}"`,
        item.status,
        item.createdAt,
        item.updatedAt
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_export_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const printInventory = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-item { text-align: center; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Inventory Report</h1>
          <p>Generated on: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}</p>
        </div>
        
        <div class="stats">
          <div class="stat-item">
            <h3>${stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
          <div class="stat-item">
            <h3>${stats.lowStockCount}</h3>
            <p>Low Stock Items</p>
          </div>
          <div class="stat-item">
            <h3>\u20BA${stats.totalValue.toFixed(2)}</h3>
            <p>Total Value</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Unit Price</th>
              <th>Total Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map((item) => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.brand}</td>
                <td>${item.category}</td>
                <td>${item.stock}</td>
                <td>\u20BA${item.unitPrice.toFixed(2)}</td>
                <td>\u20BA${item.totalValue.toFixed(2)}</td>
                <td>${item.status}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };
  const handleAddItem = () => {
    if (!formData.productName || !formData.brand || !formData.category) {
      alert("Please fill in all required fields");
      return false;
    }
    const newItem = {
      id: Date.now().toString(),
      productName: formData.productName,
      brand: formData.brand,
      model: formData.model || "",
      category: formData.category,
      stock: formData.stock || 0,
      minStock: formData.minStock || 0,
      unitPrice: formData.unitPrice || 0,
      vatIncludedPrice: (formData.unitPrice || 0) * 1.18,
      // 18% VAT
      totalValue: (formData.stock || 0) * ((formData.unitPrice || 0) * 1.18),
      barcode: formData.barcode,
      supplier: formData.supplier,
      warrantyPeriod: formData.warrantyPeriod,
      status: formData.status,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    setInventoryData((prev) => [...prev, newItem]);
    setFormData({
      productName: "",
      brand: "",
      model: "",
      category: "",
      stock: 0,
      minStock: 0,
      unitPrice: 0,
      barcode: "",
      supplier: "",
      warrantyPeriod: "",
      status: "active"
    });
    return true;
  };
  const handleEditItem = () => {
    if (!selectedItem || !formData.productName || !formData.brand || !formData.category) {
      alert("Please fill in all required fields");
      return false;
    }
    const updatedItem = {
      ...selectedItem,
      ...formData,
      vatIncludedPrice: (formData.unitPrice || 0) * 1.18,
      totalValue: (formData.stock || 0) * ((formData.unitPrice || 0) * 1.18),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    setInventoryData(
      (prev) => prev.map((item) => item.id === selectedItem.id ? updatedItem : item)
    );
    setSelectedItem(null);
    setFormData({
      productName: "",
      brand: "",
      model: "",
      category: "",
      stock: 0,
      minStock: 0,
      unitPrice: 0,
      barcode: "",
      supplier: "",
      warrantyPeriod: "",
      status: "active"
    });
    return true;
  };
  const handlePaginationChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize
    }));
  };
  const handleRowSelection = (selectedRowKeys2, selectedRows) => {
    setSelectedRowKeys(selectedRowKeys2);
  };
  return /* @__PURE__ */ jsxs26("div", { className: "p-6 space-y-6", children: [
    /* @__PURE__ */ jsxs26("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs26("div", { children: [
        /* @__PURE__ */ jsx28("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Inventory Management" }),
        /* @__PURE__ */ jsx28("p", { className: "text-gray-600 dark:text-gray-400", children: "Manage your product inventory" })
      ] }),
      /* @__PURE__ */ jsxs26("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsx28(
          Button,
          {
            variant: "outline",
            onClick: printInventory,
            icon: /* @__PURE__ */ jsx28(Download, { className: "w-4 h-4" }),
            children: "Print"
          }
        ),
        /* @__PURE__ */ jsx28(
          Button,
          {
            variant: "outline",
            onClick: () => exportToCSV(filteredData),
            icon: /* @__PURE__ */ jsx28(Download, { className: "w-4 h-4" }),
            children: "Export CSV"
          }
        ),
        /* @__PURE__ */ jsx28(
          Button,
          {
            variant: "outline",
            onClick: () => setIsBulkUploadModalOpen(true),
            icon: /* @__PURE__ */ jsx28(Upload, { className: "w-4 h-4" }),
            children: "Bulk Upload"
          }
        ),
        /* @__PURE__ */ jsx28(
          Button,
          {
            onClick: () => setIsAddModalOpen(true),
            icon: /* @__PURE__ */ jsx28(Plus3, { className: "w-4 h-4" }),
            children: "Add Product"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs26("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [
      /* @__PURE__ */ jsx28(
        StatsCard,
        {
          title: "Total Products",
          value: stats.totalProducts.toString(),
          color: "blue",
          icon: /* @__PURE__ */ jsx28(Package3, { className: "w-6 h-6" })
        }
      ),
      /* @__PURE__ */ jsx28(
        StatsCard,
        {
          title: "Low Stock",
          value: stats.lowStockCount.toString(),
          color: "red",
          icon: /* @__PURE__ */ jsx28(AlertTriangle2, { className: "w-6 h-6" })
        }
      ),
      /* @__PURE__ */ jsx28(
        StatsCard,
        {
          title: "Total Value",
          value: `\u20BA${stats.totalValue.toFixed(2)}`,
          color: "green",
          icon: /* @__PURE__ */ jsx28(DollarSign2, { className: "w-6 h-6" })
        }
      ),
      /* @__PURE__ */ jsx28(
        StatsCard,
        {
          title: "Active Items",
          value: stats.activeTrials.toString(),
          color: "purple",
          icon: /* @__PURE__ */ jsx28(TrendingUp3, { className: "w-6 h-6" })
        }
      )
    ] }),
    /* @__PURE__ */ jsx28(Card, { className: "p-4", children: /* @__PURE__ */ jsxs26("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4", children: [
      /* @__PURE__ */ jsx28("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsx28(
        Input,
        {
          placeholder: "Search products, brands, models...",
          value: filters.search,
          onChange: (e) => handleFilterChange("search", e.target.value),
          leftIcon: /* @__PURE__ */ jsx28(Search3, { className: "w-4 h-4" })
        }
      ) }),
      /* @__PURE__ */ jsx28(
        Select,
        {
          value: filters.category,
          onChange: (value) => handleFilterChange("category", value),
          options: categories.map((cat) => ({ value: cat, label: cat })),
          placeholder: "Category"
        }
      ),
      /* @__PURE__ */ jsx28(
        Select,
        {
          value: filters.brand,
          onChange: (value) => handleFilterChange("brand", value),
          options: brands.map((brand) => ({ value: brand, label: brand })),
          placeholder: "Brand"
        }
      ),
      /* @__PURE__ */ jsx28(
        Select,
        {
          value: filters.status,
          onChange: (value) => handleFilterChange("status", value),
          options: statusOptions.map((status) => ({ value: status, label: status })),
          placeholder: "Status"
        }
      ),
      /* @__PURE__ */ jsx28("div", { className: "flex items-center", children: /* @__PURE__ */ jsx28(
        Checkbox,
        {
          checked: filters.lowStock,
          onChange: (checked) => handleFilterChange("lowStock", checked),
          label: "Low Stock Only"
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx28(Card, { children: /* @__PURE__ */ jsx28(
      DataTable,
      {
        data: filteredData.slice(
          (pagination.current - 1) * pagination.pageSize,
          pagination.current * pagination.pageSize
        ),
        columns,
        loading,
        pagination: {
          ...pagination,
          onChange: handlePaginationChange
        },
        rowSelection: {
          selectedRowKeys,
          onChange: handleRowSelection
        },
        actions,
        bulkActions,
        searchable: false,
        sortable: true,
        rowKey: "id",
        hoverable: true,
        striped: true
      }
    ) }),
    /* @__PURE__ */ jsx28(
      Modal,
      {
        isOpen: isAddModalOpen,
        onClose: () => setIsAddModalOpen(false),
        onSave: handleAddItem,
        title: "Add New Product",
        size: "lg",
        children: /* @__PURE__ */ jsxs26("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs26("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Product Name *",
                value: formData.productName || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, productName: e.target.value })),
                placeholder: "Enter product name"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Brand *",
                value: formData.brand || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, brand: e.target.value })),
                placeholder: "Enter brand"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Model",
                value: formData.model || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, model: e.target.value })),
                placeholder: "Enter model"
              }
            ),
            /* @__PURE__ */ jsx28(
              Select,
              {
                label: "Category *",
                value: formData.category || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, category: e.target.value })),
                options: categories.filter((cat) => cat !== "All").map((cat) => ({ value: cat, label: cat })),
                placeholder: "Select category"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Stock Quantity",
                type: "number",
                value: formData.stock?.toString() || "0",
                onChange: (e) => setFormData((prev) => ({ ...prev, stock: parseInt(e.target.value) || 0 })),
                placeholder: "0"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Minimum Stock",
                type: "number",
                value: formData.minStock?.toString() || "0",
                onChange: (e) => setFormData((prev) => ({ ...prev, minStock: parseInt(e.target.value) || 0 })),
                placeholder: "0"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Unit Price",
                type: "number",
                step: "0.01",
                value: formData.unitPrice?.toString() || "0",
                onChange: (e) => setFormData((prev) => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 })),
                placeholder: "0.00"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Barcode",
                value: formData.barcode || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, barcode: e.target.value })),
                placeholder: "Enter barcode"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Supplier",
                value: formData.supplier || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, supplier: e.target.value })),
                placeholder: "Enter supplier"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Warranty Period",
                value: formData.warrantyPeriod || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, warrantyPeriod: e.target.value })),
                placeholder: "e.g., 2 years"
              }
            )
          ] }),
          /* @__PURE__ */ jsx28(
            Select,
            {
              label: "Status",
              value: formData.status || "active",
              onChange: (e) => setFormData((prev) => ({ ...prev, status: e.target.value })),
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "discontinued", label: "Discontinued" }
              ]
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsx28(
      Modal,
      {
        isOpen: isEditModalOpen,
        onClose: () => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        },
        onSave: handleEditItem,
        title: "Edit Product",
        size: "lg",
        children: /* @__PURE__ */ jsxs26("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs26("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Product Name *",
                value: formData.productName || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, productName: e.target.value })),
                placeholder: "Enter product name"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Brand *",
                value: formData.brand || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, brand: e.target.value })),
                placeholder: "Enter brand"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Model",
                value: formData.model || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, model: e.target.value })),
                placeholder: "Enter model"
              }
            ),
            /* @__PURE__ */ jsx28(
              Select,
              {
                label: "Category *",
                value: formData.category || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, category: e.target.value })),
                options: categories.filter((cat) => cat !== "All").map((cat) => ({ value: cat, label: cat })),
                placeholder: "Select category"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Stock Quantity",
                type: "number",
                value: formData.stock?.toString() || "0",
                onChange: (e) => setFormData((prev) => ({ ...prev, stock: parseInt(e.target.value) || 0 })),
                placeholder: "0"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Minimum Stock",
                type: "number",
                value: formData.minStock?.toString() || "0",
                onChange: (e) => setFormData((prev) => ({ ...prev, minStock: parseInt(e.target.value) || 0 })),
                placeholder: "0"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Unit Price",
                type: "number",
                step: "0.01",
                value: formData.unitPrice?.toString() || "0",
                onChange: (e) => setFormData((prev) => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 })),
                placeholder: "0.00"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Barcode",
                value: formData.barcode || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, barcode: e.target.value })),
                placeholder: "Enter barcode"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Supplier",
                value: formData.supplier || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, supplier: e.target.value })),
                placeholder: "Enter supplier"
              }
            ),
            /* @__PURE__ */ jsx28(
              Input,
              {
                label: "Warranty Period",
                value: formData.warrantyPeriod || "",
                onChange: (e) => setFormData((prev) => ({ ...prev, warrantyPeriod: e.target.value })),
                placeholder: "e.g., 2 years"
              }
            )
          ] }),
          /* @__PURE__ */ jsx28(
            Select,
            {
              label: "Status",
              value: formData.status || "active",
              onChange: (e) => setFormData((prev) => ({ ...prev, status: e.target.value })),
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "discontinued", label: "Discontinued" }
              ]
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsx28(
      Modal,
      {
        isOpen: isBulkUploadModalOpen,
        onClose: () => setIsBulkUploadModalOpen(false),
        title: "Bulk Upload Products",
        size: "md",
        children: /* @__PURE__ */ jsxs26("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs26("div", { className: "text-center", children: [
            /* @__PURE__ */ jsx28(Upload, { className: "w-12 h-12 mx-auto text-gray-400 mb-4" }),
            /* @__PURE__ */ jsx28("p", { className: "text-gray-600 dark:text-gray-400", children: "Upload a CSV file with your product data" })
          ] }),
          /* @__PURE__ */ jsx28("div", { className: "border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6", children: /* @__PURE__ */ jsx28(
            "input",
            {
              type: "file",
              accept: ".csv",
              className: "w-full",
              onChange: (e) => {
                console.log("File selected:", e.target.files?.[0]);
              }
            }
          ) }),
          /* @__PURE__ */ jsx28("div", { className: "text-sm text-gray-500 dark:text-gray-400", children: /* @__PURE__ */ jsx28("p", { children: "CSV format: Product Name, Brand, Model, Category, Stock, Min Stock, Unit Price, Barcode, Supplier, Warranty Period" }) })
        ] })
      }
    )
  ] });
};
var InventoryPage_default = InventoryPage;
export {
  Alert,
  Autocomplete,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  ComponentsDemo_default as ComponentsDemo,
  DataTable,
  DatePicker,
  Dropdown,
  DynamicForm,
  FileUpload,
  Input,
  InventoryPage_default as InventoryPage,
  Layout_default as Layout,
  Loading,
  Modal,
  MultiSelect,
  Pagination,
  Radio,
  RadioGroup,
  Select,
  SimplePagination,
  Spinner,
  StatsCard,
  Tabs,
  Textarea,
  ToastProvider,
  Tooltip,
  createInventoryStats,
  createPatientStats,
  useModal,
  useToast,
  useToastHelpers
};
//# sourceMappingURL=index.mjs.map