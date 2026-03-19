// js/glowing-effect.js

document.addEventListener('DOMContentLoaded', () => {
    // Inject the glowing effect HTML into all feature cards and problem cards
    const cards = document.querySelectorAll('.feature-card, .problem__card, .step');
    
    cards.forEach(card => {
        // Ensure parent has position relative for absolute positioning of glow
        if (getComputedStyle(card).position === 'static') {
            card.style.position = 'relative';
        }
        
        const effectContainer = document.createElement('div');
        effectContainer.className = 'glowing-effect';
        
        const glow = document.createElement('div');
        glow.className = 'glowing-effect__glow';
        
        const cover = document.createElement('div');
        cover.className = 'glowing-effect__cover';
        
        effectContainer.appendChild(glow);
        effectContainer.appendChild(cover);
        card.appendChild(effectContainer);
        
        // Mark the card so CSS can remove its default backgrounds/borders
        card.classList.add('has-glow');
    });

    const glowingElements = document.querySelectorAll('.glowing-effect');
    if (glowingElements.length === 0) return;

    let lastPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let animationFrameId = null;

    const elementStates = Array.from(glowingElements).map(el => ({
        element: el,
        currentAngle: 0,
        targetAngle: 0
    }));

    const lerpAngle = (start, end, factor) => {
        let diff = ((end - start + 180) % 360) - 180;
        if(diff < -180) diff += 360;
        return start + diff * factor;
    };

    const handlePointerMove = (e) => {
        lastPosition.x = e.clientX;
        lastPosition.y = e.clientY;
    };

    const animateLoop = () => {
        const mouseX = lastPosition.x;
        const mouseY = lastPosition.y;

        elementStates.forEach(state => {
            const el = state.element;
            const parent = el.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            
            // Calculate distance to center
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const inactiveZone = 0.5; // Custom proximity
            const inactiveRadius = 0.5 * Math.min(rect.width, rect.height) * inactiveZone;
            const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
            
            // Check if mouse is over/near
            const proximity = 120; // Activate when mouse is slightly outside the card
            const isActive = 
                mouseX > rect.left - proximity &&
                mouseX < rect.right + proximity &&
                mouseY > rect.top - proximity &&
                mouseY < rect.bottom + proximity;

            if (dist < inactiveRadius) {
                // Dim down when hovering heavily over the dead center to prevent distraction
                el.style.setProperty('--active', '0.2');
            } else {
                el.style.setProperty('--active', isActive ? '1' : '0');
            }

            if (isActive) {
                // Calculate target angle pointing to the mouse
                const rad = Math.atan2(mouseY - centerY, mouseX - centerX);
                state.targetAngle = (rad * 180) / Math.PI + 90;

                // Smoothly interpolate angle
                state.currentAngle = lerpAngle(state.currentAngle, state.targetAngle, 0.1); 
                el.style.setProperty('--start', String(state.currentAngle));
            }
        });

        animationFrameId = requestAnimationFrame(animateLoop);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    // Keep animation running smoothly
    animationFrameId = requestAnimationFrame(animateLoop);
});
