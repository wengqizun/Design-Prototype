import { getCurrentInstance } from 'vue'

export type Jump = {
  id: string
  to: string
  reason?: string
}

type ComponentWithJumps = {
  __jumps?: Jump[]
}

export const useJumps = () => {
  const instance = getCurrentInstance()
  const jumps = ((instance?.type as ComponentWithJumps | undefined)?.__jumps ?? []) as Jump[]

  const getJump = (id: string) => {
    return jumps.find((jump) => jump.id === id)
  }

  const getJumpTo = (id: string) => {
    return getJump(id)?.to
  }

  return {
    jumps,
    getJump,
    getJumpTo,
  }
}
