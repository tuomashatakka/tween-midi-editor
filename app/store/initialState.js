export default {
  editor: {
    document: {
      title:      '',
      format:     null,
      tempo:      120,
      samples:    4 * 480,
      trackCount: 0,
    },
    blocks:   [],
    selected: [],
    grid: {
      sub: 4,
      size: 30,
      vertical: 30,
      horizontal: 120,
    },
  },
  tool: {
    tool: null,
    preferences: {
      isOpen: false,
    }
  },
  counter: 1
}
