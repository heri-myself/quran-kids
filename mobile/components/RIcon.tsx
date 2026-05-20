import React from 'react'
import Svg, { Path } from 'react-native-svg'
import { RiIcon } from './RiIcon'

const SVG_ICONS: Record<string, string> = {
  'quran-fill': 'M2 3.993C2 3.445 2.445 3 2.993 3H21.007C21.555 3 22 3.445 22 3.993V20.007C22 20.555 21.555 21 21.007 21H2.993C2.445 21 2 20.555 2 20.007V3.993ZM11 5H4V19H11V5ZM13 5V19H20V5H13ZM14 7H19V9H14V7ZM14 10H19V12H14V10Z',
  'quran-line': 'M2 3.993C2 3.445 2.445 3 2.993 3H21.007C21.555 3 22 3.445 22 3.993V20.007C22 20.555 21.555 21 21.007 21H2.993C2.445 21 2 20.555 2 20.007V3.993ZM11 5H4V19H11V5ZM13 5V19H20V5H13ZM4 5V19H11V5H4ZM14 7H19V9H14V7ZM14 10H19V12H14V10Z',
  'story-fill': 'M21 2H3C2.44772 2 2 2.44772 2 3V17C2 17.5523 2.44772 18 3 18H10L12 22L14 18H21C21.5523 18 22 17.5523 22 17V3C22 2.44772 21.5523 2 21 2ZM8 9H16V11H8V9ZM8 6H16V8H8V6ZM8 12H13V14H8V12Z',
  'story-line': 'M21 2H3C2.44772 2 2 2.44772 2 3V17C2 17.5523 2.44772 18 3 18H10L12 22L14 18H21C21.5523 18 22 17.5523 22 17V3C22 2.44772 21.5523 2 21 2ZM20 16H13.236L12 18.382L10.764 16H4V4H20V16ZM8 9H16V11H8V9ZM8 6H16V8H8V6ZM8 12H13V14H8V12Z',
}

interface RIconProps {
  name: string
  size?: number
  color?: string
}

export function RIcon({ name, size = 24, color = '#1A1A2E' }: RIconProps) {
  const path = SVG_ICONS[name]
  if (path) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d={path} fill={color} />
      </Svg>
    )
  }
  return <RiIcon name={name as any} size={size} color={color} />
}
