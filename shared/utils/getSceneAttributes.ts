type GetSceneAttributesReturnType = {
  'data-scene-position'?: 'top' | 'center' | 'left'
  'data-scene-rotate'?: boolean
}

export function getSceneAttributes(params?: {
  position?: 'top' | 'center' | 'left'
  rotate?: boolean
}): GetSceneAttributesReturnType {
  return {
    'data-scene-position': params?.position,
    'data-scene-rotate': params?.rotate
  }
}
