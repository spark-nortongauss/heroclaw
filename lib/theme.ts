export const theme = {
  colors: {
    neonLime: '#D9FF35',
    gray: '#808080',
    deepGreen: '#234234',
    white: '#FFFFFF'
  },
  ticketStatusLabel: {
    done: 'Done',
    ongoing: 'Ongoing',
    not_done: 'Not done'
  }
} as const;

export type TicketStatus = keyof typeof theme.ticketStatusLabel;
