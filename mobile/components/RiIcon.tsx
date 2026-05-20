import React from 'react'
import {
  ArrowLeft, ArrowRight, CaretLeft, CaretRight,
  Microphone, StopCircle, SkipForward, SkipBack,
  Play, PlayCircle, Pause, PauseCircle, SpeakerHigh,
  BookOpen, Books, Book, ListBullets,
  User, UserCircle, Users,
  House, GearSix, SignOut,
  Star, Trophy, Medal, Heart, Gift,
  Check, X, Plus, PencilSimple, MagnifyingGlass,
  Clock, ClipboardText, DotsThreeOutline,
  Lightbulb, Moon, MapPin, Lock,
} from 'phosphor-react-native'

type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'

const ICON_MAP: Record<string, { Component: React.ComponentType<any>; weight: IconWeight }> = {
  // Navigation
  'arrow-left-line':       { Component: ArrowLeft,        weight: 'regular' },
  'arrow-left-s-line':     { Component: CaretLeft,         weight: 'regular' },
  'arrow-right-s-line':    { Component: CaretRight,        weight: 'regular' },
  'arrow-right-line':      { Component: ArrowRight,        weight: 'regular' },
  'arrow-right':           { Component: ArrowRight,        weight: 'regular' },
  'arrow-left':            { Component: ArrowLeft,         weight: 'regular' },
  // Media controls
  'mic-line':              { Component: Microphone,        weight: 'regular' },
  'mic-fill':              { Component: Microphone,        weight: 'fill' },
  'stop-circle-line':      { Component: StopCircle,        weight: 'regular' },
  'stop-circle-fill':      { Component: StopCircle,        weight: 'fill' },
  'skip-forward-line':     { Component: SkipForward,       weight: 'regular' },
  'skip-back-line':        { Component: SkipBack,          weight: 'regular' },
  'play-circle-line':      { Component: PlayCircle,        weight: 'regular' },
  'play-fill':             { Component: Play,              weight: 'fill' },
  'pause-circle-line':     { Component: PauseCircle,       weight: 'regular' },
  'pause-fill':            { Component: Pause,             weight: 'fill' },
  'volume-up-line':        { Component: SpeakerHigh,       weight: 'regular' },
  // Books & content
  'book-open-line':        { Component: BookOpen,          weight: 'regular' },
  'book-open-fill':        { Component: BookOpen,          weight: 'fill' },
  'book-2-line':           { Component: Books,             weight: 'regular' },
  'book-2-fill':           { Component: Books,             weight: 'fill' },
  'book-fill':             { Component: Book,              weight: 'fill' },
  'book-line':             { Component: Book,              weight: 'regular' },
  'file-list-line':        { Component: ListBullets,       weight: 'regular' },
  // User & account
  'user-line':             { Component: User,              weight: 'regular' },
  'user-fill':             { Component: User,              weight: 'fill' },
  'account-circle-line':   { Component: UserCircle,        weight: 'regular' },
  'account-circle-fill':   { Component: UserCircle,        weight: 'fill' },
  'parent-line':           { Component: Users,             weight: 'regular' },
  // Home & navigation
  'home-line':             { Component: House,             weight: 'regular' },
  'home-fill':             { Component: House,             weight: 'fill' },
  'settings-line':         { Component: GearSix,           weight: 'regular' },
  'logout-box-line':       { Component: SignOut,           weight: 'regular' },
  // Status & rewards
  'star-fill':             { Component: Star,              weight: 'fill' },
  'star-line':             { Component: Star,              weight: 'regular' },
  'trophy-line':           { Component: Trophy,            weight: 'regular' },
  'trophy-fill':           { Component: Trophy,            weight: 'fill' },
  'award-line':            { Component: Medal,             weight: 'regular' },
  'medal-line':            { Component: Medal,             weight: 'regular' },
  'heart-line':            { Component: Heart,             weight: 'regular' },
  'gift-fill':             { Component: Gift,              weight: 'fill' },
  'gift-line':             { Component: Gift,              weight: 'regular' },
  // Actions
  'check-line':            { Component: Check,             weight: 'regular' },
  'close-line':            { Component: X,                 weight: 'regular' },
  'add-line':              { Component: Plus,              weight: 'regular' },
  'edit-line':             { Component: PencilSimple,      weight: 'regular' },
  'search-line':           { Component: MagnifyingGlass,   weight: 'regular' },
  'time-line':             { Component: Clock,             weight: 'regular' },
  'task-line':             { Component: ClipboardText,     weight: 'regular' },
  'more-2-fill':           { Component: DotsThreeOutline,  weight: 'fill' },
  'lightbulb-line':        { Component: Lightbulb,         weight: 'regular' },
  'lightbulb-fill':        { Component: Lightbulb,         weight: 'fill' },
  'moon-line':             { Component: Moon,              weight: 'regular' },
  'moon-fill':             { Component: Moon,              weight: 'fill' },
  'map-pin-line':          { Component: MapPin,            weight: 'regular' },
  'lock-line':             { Component: Lock,              weight: 'regular' },
}

interface RiIconProps {
  name: keyof typeof ICON_MAP
  size?: number
  color?: string
}

export function RiIcon({ name, size = 20, color = '#fff' }: RiIconProps) {
  const entry = ICON_MAP[name]
  if (!entry) return null
  const { Component, weight } = entry
  return <Component size={size} color={color} weight={weight} />
}
