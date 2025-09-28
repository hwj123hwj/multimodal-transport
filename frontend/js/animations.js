/**
 * Animations.js - 动画组件
 * 提供各种精美的动画效果
 */

class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * 数字计数动画
     */
    animateNumber(element, start, end, duration = 2000, options = {}) {
        if (this.isReducedMotion) {
            element.textContent = end;
            return;
        }

        const startTime = performance.now();
        const isInteger = Number.isInteger(start) && Number.isInteger(end);
        const prefix = options.prefix || '';
        const suffix = options.suffix || '';

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * easeOutQuart;
            
            const displayValue = isInteger ? Math.floor(current) : current.toFixed(options.decimals || 2);
            element.textContent = prefix + displayValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 元素淡入动画
     */
    fadeIn(element, duration = 600, delay = 0) {
        if (this.isReducedMotion) {
            element.style.opacity = '1';
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            setTimeout(() => {
                element.style.transition = `opacity ${duration}ms ease-out`;
                element.style.opacity = '1';
                
                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 元素淡出动画
     */
    fadeOut(element, duration = 600, delay = 0) {
        if (this.isReducedMotion) {
            element.style.opacity = '0';
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                element.style.transition = `opacity ${duration}ms ease-out`;
                element.style.opacity = '0';
                
                setTimeout(() => {
                    element.style.display = 'none';
                    element.style.transition = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 元素滑入动画
     */
    slideIn(element, direction = 'left', duration = 800, delay = 0) {
        if (this.isReducedMotion) {
            element.style.transform = 'translateX(0) translateY(0)';
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const directions = {
                left: { x: -100, y: 0 },
                right: { x: 100, y: 0 },
                top: { x: 0, y: -100 },
                bottom: { x: 0, y: 100 }
            };

            const offset = directions[direction] || directions.left;
            
            element.style.transform = `translateX(${offset.x}px) translateY(${offset.y}px)`;
            element.style.opacity = '0';
            element.style.display = 'block';
            
            setTimeout(() => {
                element.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${duration}ms ease-out`;
                element.style.transform = 'translateX(0) translateY(0)';
                element.style.opacity = '1';
                
                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 元素缩放动画
     */
    scaleIn(element, duration = 600, delay = 0) {
        if (this.isReducedMotion) {
            element.style.transform = 'scale(1)';
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            element.style.transform = 'scale(0.8)';
            element.style.opacity = '0';
            element.style.display = 'block';
            
            setTimeout(() => {
                element.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${duration}ms ease-out`;
                element.style.transform = 'scale(1)';
                element.style.opacity = '1';
                
                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 元素旋转动画
     */
    rotate(element, duration = 1000, delay = 0) {
        if (this.isReducedMotion) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                element.style.transition = `transform ${duration}ms ease-in-out`;
                element.style.transform = 'rotate(360deg)';
                
                setTimeout(() => {
                    element.style.transition = '';
                    element.style.transform = 'rotate(0deg)';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 脉冲动画
     */
    pulse(element, duration = 2000, delay = 0) {
        if (this.isReducedMotion) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                element.style.animation = `pulse ${duration}ms ease-in-out infinite`;
                
                setTimeout(() => {
                    element.style.animation = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 弹跳动画
     */
    bounce(element, duration = 1000, delay = 0) {
        if (this.isReducedMotion) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                element.style.animation = `bounce ${duration}ms ease-in-out`;
                
                setTimeout(() => {
                    element.style.animation = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 摇晃动画
     */
    shake(element, duration = 500, delay = 0) {
        if (this.isReducedMotion) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                element.style.animation = `shake ${duration}ms ease-in-out`;
                
                setTimeout(() => {
                    element.style.animation = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 波纹效果
     */
    ripple(element, x, y) {
        if (this.isReducedMotion) {
            return;
        }

        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * 打字机效果
     */
    typewriter(element, text, duration = 100, delay = 0) {
        if (this.isReducedMotion) {
            element.textContent = text;
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            element.textContent = '';
            let index = 0;
            
            setTimeout(() => {
                const type = () => {
                    if (index < text.length) {
                        element.textContent += text[index];
                        index++;
                        setTimeout(type, duration);
                    } else {
                        resolve();
                    }
                };
                
                type();
            }, delay);
        });
    }

    /**
     * 进度条动画
     */
    animateProgress(element, targetProgress, duration = 1500, delay = 0) {
        if (this.isReducedMotion) {
            element.style.width = targetProgress + '%';
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const startProgress = parseFloat(element.style.width) || 0;
            const startTime = performance.now();
            
            setTimeout(() => {
                const animate = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                    const currentProgress = startProgress + (targetProgress - startProgress) * easeOutQuart;
                    
                    element.style.width = currentProgress + '%';
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        resolve();
                    }
                };
                
                requestAnimationFrame(animate);
            }, delay);
        });
    }

    /**
     * 卡片翻转动画
     */
    flipCard(card, duration = 800, delay = 0) {
        if (this.isReducedMotion) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                card.style.transform = 'rotateY(180deg)';
                card.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                
                setTimeout(() => {
                    card.style.transition = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 元素高亮动画
     */
    highlight(element, duration = 1000, delay = 0) {
        if (this.isReducedMotion) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                element.style.animation = `highlight ${duration}ms ease-in-out`;
                
                setTimeout(() => {
                    element.style.animation = '';
                    resolve();
                }, duration);
            }, delay);
        });
    }

    /**
     * 元素呼吸动画
     */
    breathe(element, duration = 3000, delay = 0) {
        if (this.isReducedMotion) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                element.style.animation = `breathe ${duration}ms ease-in-out infinite`;
                
                // 不自动停止呼吸动画
                if (duration === Infinity) {
                    resolve();
                } else {
                    setTimeout(() => {
                        element.style.animation = '';
                        resolve();
                    }, duration);
                }
            }, delay);
        });
    }

    /**
     * 创建动画序列
     */
    createSequence(animations) {
        return animations.reduce((promise, animation) => {
            return promise.then(() => animation());
        }, Promise.resolve());
    }

    /**
     * 创建并行动画
     */
    createParallel(animations) {
        return Promise.all(animations.map(animation => animation()));
    }

    /**
     * 停止所有动画
     */
    stopAll() {
        document.querySelectorAll('*').forEach(element => {
            element.style.animation = '';
            element.style.transition = '';
        });
    }
}

// 添加CSS动画关键帧
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-20px); }
        60% { transform: translateY(-10px); }
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }

    @keyframes ripple {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(4);
            opacity: 0;
        }
    }

    @keyframes highlight {
        0% { background-color: transparent; }
        50% { background-color: rgba(59, 130, 246, 0.2); }
        100% { background-color: transparent; }
    }

    @keyframes breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }

    .ripple-effect {
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 600ms linear;
        pointer-events: none;
    }
`;
document.head.appendChild(style);

// 创建全局动画管理器实例
window.animationManager = new AnimationManager();