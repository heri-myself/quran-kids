import { Text as RNText, TextProps, StyleSheet } from 'react-native'

const WEIGHT_MAP: Record<string, string> = {
  '100': 'Fredoka_300Light',
  '200': 'Fredoka_300Light',
  '300': 'Fredoka_300Light',
  '400': 'Fredoka_400Regular',
  '500': 'Fredoka_500Medium',
  '600': 'Fredoka_600SemiBold',
  '700': 'Fredoka_600SemiBold',
  '800': 'Fredoka_600SemiBold',
  '900': 'Fredoka_600SemiBold',
  bold: 'Fredoka_600SemiBold',
  normal: 'Fredoka_400Regular',
}

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {}
  const weight = String(flat.fontWeight ?? '400')
  const resolvedFamily = flat.fontFamily ?? WEIGHT_MAP[weight] ?? 'Fredoka_400Regular'

  return (
    <RNText
      {...props}
      style={[{ fontFamily: resolvedFamily }, style, { fontWeight: undefined }]}
    />
  )
}
