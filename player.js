/* player.js
   FF/COD style touch controls:
   - left joystick (fixed circle, bottom-left) for movement
   - dragging anywhere else on screen (except buttons) looks around
   - both can be held at once since touches are tracked separately
     by their own touch identifier
*/

var PlayerController = (function(){

    var moveVector = { x: 0, z: 0 };
    var lookDelta = { x: 0, y: 0 };
    var lookSensitivity = 0.0035;

    var joystickBase, joystickKnob;
    var joystickTouchId = null;
    var joystickCenter = { x: 0, y: 0 };
    var joystickRadius = 50;

    var lookTouchId = null;
    var lastLook = { x: 0, y: 0 };

    var isCrouching = false;
    var jumpRequested = false;

    function init(){
        joystickBase = document.getElementById('joystickBase');
        joystickKnob = document.getElementById('joystickKnob');

        measureJoystick();
        window.addEventListener('resize', measureJoystick);

        document.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: false });
        document.addEventListener('touchcancel', onTouchEnd, { passive: false });

        var jumpBtn = document.getElementById('jumpBtn');
        var crouchBtn = document.getElementById('crouchBtn');

        if(jumpBtn){
            jumpBtn.addEventListener('touchstart', function(e){
                e.preventDefault();
                jumpRequested = true;
            });
        }

        if(crouchBtn){
            crouchBtn.addEventListener('touchstart', function(e){
                e.preventDefault();
                isCrouching = !isCrouching;
                crouchBtn.classList.toggle('active', isCrouching);
            });
        }
    }

    function measureJoystick(){
        if(!joystickBase)return;
        var rect = joystickBase.getBoundingClientRect();
        joystickCenter.x = rect.left + rect.width / 2;
        joystickCenter.y = rect.top + rect.height / 2;
        joystickRadius = rect.width / 2;
    }

    function isInsideJoystick(x, y){
        var dx = x - joystickCenter.x;
        var dy = y - joystickCenter.y;
        return Math.sqrt(dx * dx + dy * dy) < joystickRadius * 1.6;
    }

    function isOnControlButton(x, y){
        var ids = ['fireBtn', 'jumpBtn', 'crouchBtn'];
        for(var i = 0; i < ids.length; i++){
            var el = document.getElementById(ids[i]);
            if(!el)continue;
            var r = el.getBoundingClientRect();
            if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom){
                return true;
            }
        }
        return false;
    }

    function onTouchStart(e){
        for(var i = 0; i < e.changedTouches.length; i++){
            var t = e.changedTouches[i];

            if(joystickTouchId === null && isInsideJoystick(t.clientX, t.clientY)){
                joystickTouchId = t.identifier;
                updateJoystick(t.clientX, t.clientY);
                continue;
            }

            if(lookTouchId === null && !isOnControlButton(t.clientX, t.clientY)){
                lookTouchId = t.identifier;
                lastLook.x = t.clientX;
                lastLook.y = t.clientY;
            }
        }
    }

    function onTouchMove(e){
        for(var i = 0; i < e.changedTouches.length; i++){
            var t = e.changedTouches[i];

            if(t.identifier === joystickTouchId){
                updateJoystick(t.clientX, t.clientY);
            }

            if(t.identifier === lookTouchId){
                var dx = t.clientX - lastLook.x;
                var dy = t.clientY - lastLook.y;
                lookDelta.x += dx * lookSensitivity;
                lookDelta.y += dy * lookSensitivity;
                lastLook.x = t.clientX;
                lastLook.y = t.clientY;
            }
        }
        e.preventDefault();
    }

    function onTouchEnd(e){
        for(var i = 0; i < e.changedTouches.length; i++){
            var t = e.changedTouches[i];

            if(t.identifier === joystickTouchId){
                joystickTouchId = null;
                moveVector.x = 0;
                moveVector.z = 0;
                if(joystickKnob){
                    joystickKnob.style.transform = 'translate(0px, 0px)';
                }
            }

            if(t.identifier === lookTouchId){
                lookTouchId = null;
            }
        }
    }

    function updateJoystick(x, y){
        var dx = x - joystickCenter.x;
        var dy = y - joystickCenter.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var maxDist = joystickRadius;

        if(dist > maxDist){
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        if(joystickKnob){
            joystickKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        }

        moveVector.x = dx / maxDist;
        moveVector.z = dy / maxDist;
    }

    function consumeLookDelta(){
        var d = { x: lookDelta.x, y: lookDelta.y };
        lookDelta.x = 0;
        lookDelta.y = 0;
        return d;
    }

    function consumeJumpRequest(){
        var j = jumpRequested;
        jumpRequested = false;
        return j;
    }

    function getMoveVector(){
        return moveVector;
    }

    function getIsCrouching(){
        return isCrouching;
    }

    function setLookSensitivity(multiplier){
        lookSensitivity = 0.0035 * multiplier;
    }

    return {
        init: init,
        consumeLookDelta: consumeLookDelta,
        consumeJumpRequest: consumeJumpRequest,
        getMoveVector: getMoveVector,
        getIsCrouching: getIsCrouching,
        setLookSensitivity: setLookSensitivity
    };

})();
