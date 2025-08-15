const { TestEnvironment } = require('jest-environment-jsdom');

class CustomJSDOMEnvironment extends TestEnvironment {
  constructor(...args) {
    super(...args);

    // Create a mock element to get style properties
    const mockStyle = {
      WebkitAnimation: '',
      animation: '',
      WebkitTransform: '',
      transform: '',
      WebkitTransition: '',
      transition: '',
    };

    // Override Element.prototype.style globally
    if (this.global.Element && this.global.Element.prototype) {
      Object.defineProperty(this.global.Element.prototype, 'style', {
        get() {
          return new Proxy(mockStyle, {
            get(target, prop) {
              return target[prop] !== undefined ? target[prop] : '';
            },
            set(target, prop, value) {
              target[prop] = value;
              return true;
            },
            has() {
              return true;
            },
            ownKeys() {
              return Object.keys(target);
            }
          });
        },
        configurable: true,
        enumerable: true,
      });
    }

    // Add animation frame polyfills
    this.global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    this.global.cancelAnimationFrame = (id) => clearTimeout(id);
  }
}

module.exports = CustomJSDOMEnvironment;