type ScenePosition = 'top' | 'center' | 'left' | 'right' | 'top-left' | 'top-right' | 'center-left' | 'center-right'

type GetSceneAttributesReturnType = {
  'data-scene-position'?: ScenePosition
  'data-scene-model'?: string
  'data-scene-rotate'?: boolean
}

export function getSceneAttributes(params?: {
  position?: ScenePosition
  model?: string
  rotate?: boolean
}): GetSceneAttributesReturnType {
  return {
    'data-scene-position': params?.position,
    'data-scene-model': params?.model,
    'data-scene-rotate': params?.rotate
  }
}
