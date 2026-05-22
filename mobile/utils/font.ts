export function fredoka(weight?: string | number): string {
  const w = String(weight ?? '400')
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return 'Fredoka_700Bold'
  if (w === '600' || w === 'semibold') return 'Fredoka_600SemiBold'
  if (w === '500' || w === 'medium') return 'Fredoka_500Medium'
  if (w === '300' || w === 'light') return 'Fredoka_300Light'
  return 'Fredoka_400Regular'
}
