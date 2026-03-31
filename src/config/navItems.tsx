import React from 'react';
import {
  LayoutDashboard, MessageSquare, Target, Swords,
  BrainCircuit, BookOpen, BarChart2, List,
  CalendarDays, Archive, Map as MapIcon, Telescope,
  Settings, UserCircle, Clock
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard' | 'coach' | 'countdown' | 'war_room'
  | 'questions' | 'explain' | 'exams' | 'logs'
  | 'agenda' | 'archive' | 'subjects' | 'strategy'
  | 'settings' | 'profile';

export interface NavItemConfig {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  mobileVisible: boolean;
  desktopVisible: boolean;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard',  label: 'Ana Sayfa',  icon: <LayoutDashboard size={18} />, mobileVisible: true,  desktopVisible: true  },
  { id: 'coach',      label: 'Koç',        icon: <MessageSquare    size={18} />, mobileVisible: true,  desktopVisible: true  },
  { id: 'countdown',  label: 'Sayaç',      icon: <Clock            size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'war_room',   label: 'Savaş',      icon: <Swords           size={18} />, mobileVisible: true,  desktopVisible: true  },
  { id: 'questions',  label: 'Quiz',       icon: <BrainCircuit     size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'explain',    label: 'Anlatım',    icon: <BookOpen         size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'exams',      label: 'Deneme',     icon: <BarChart2        size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'logs',       label: 'Loglar',     icon: <List             size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'agenda',     label: 'Ajanda',     icon: <CalendarDays     size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'archive',    label: 'Mezarlık',   icon: <Archive          size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'subjects',   label: 'Müfredat',   icon: <MapIcon          size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'strategy',   label: 'Strateji',   icon: <Telescope        size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'settings',   label: 'Ayarlar',    icon: <Settings         size={18} />, mobileVisible: false, desktopVisible: true  },
  { id: 'profile',    label: 'Profil',     icon: <UserCircle       size={18} />, mobileVisible: true,  desktopVisible: true  },
];
