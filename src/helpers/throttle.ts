import _throttle from 'lodash/throttle'

function setupThrottle() {
  const throttledFn = _throttle(
    (cb) => {
      cb()
    },
    500,
    { leading: true, trailing: false }
  )

  return throttledFn
}

export const singletonThrottle = setupThrottle()
