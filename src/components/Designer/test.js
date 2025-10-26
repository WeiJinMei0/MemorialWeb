import { useState, useCallback, useRef, useEffect } from 'react'

const initialDesignState = {
  // 主产品
  monument: null,
  // 底座
  base: {
    model: null,
    polish: 'P5',
    color: 'Black',
    dimensions: { length: 0, width: 0, height: 0 },
    originalDimensions: { length: 0, width: 0, height: 0 },
    weight: 0,
    visible: false
  },
  // 副底座
  subBase: {
    model: null,
    polish: 'P5',
    color: 'Black',
    dimensions: { length: 0, width: 0, height: 0 },
    originalDimensions: { length: 0, width: 0, height: 0 },
    weight: 0,
    visible: false
  },
  // 其他元素
  vases: [],
  artElements: [],
  textElements: [],
  currentMaterial: 'Black',
  // history: [],
  // historyIndex: -1
}

const [designState, setDesignState] = useState(initialDesignState)

const newState = {
      monument: {
        model: monumentModelPath,
        family,
        class: productClass,
        polish,
        color,
        dimensions: { ...monumentDimensions },
        originalDimensions: { ...monumentDimensions },
        weight: calculateWeight(monumentDimensions, color)
      },
      base: {
        model: baseModelPath,
        basepolish,
        color,
        dimensions: { ...baseDimensions },
        originalDimensions: { ...baseDimensions },
        weight: calculateWeight(baseDimensions, color),
        visible: true
      },
      currentMaterial: color
    }
    
setDesignState(newState)
useEffect(() => {
console.log(designState)
}, [designState])