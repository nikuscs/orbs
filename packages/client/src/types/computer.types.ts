export type ComputerTone = 'default' | 'success' | 'warning';

export interface ComputerLabel {
  label: string
  tone: ComputerTone
}

export interface ComputerTicket {
  url: string
  startedAt: number | null
  isControlling: boolean
}
