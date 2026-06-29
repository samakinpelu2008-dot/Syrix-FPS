/* hud.js
   Drives every overlay element: health, ammo, hit markers, kill feed,
   minimap. Reads a "hudPrefs" object from localStorage so hud.html
   (reached from inside settings.html) can control what shows and
   where, without this file needing to change.
*/

var HUD = (function(){

    var prefs = {
        showMinimap: true,
        showKillFeed: true,
        showHitMarkers: true,
        joystickSize: 1,
        lookSensitivity: 1
    };

    var healthFill, ammoText, hitMarker, killFeedList, reloadLabel;

    function init(){
        loadPrefs();

        healthFill = document.getElementById('healthFill');
        ammoText = document.getElementById('ammoText');
        hitMarker = document.getElementById('hitMarker');
        killFeedList = document.getElementById('killFeedList');
        reloadLabel = document.getElementById('reloadLabel');

        applyPrefs();
    }

    function loadPrefs(){
        var saved = localStorage.getItem('hudPrefs');
        if(!saved)return;

        try{
            var parsed = JSON.parse(saved);
            for(var key in parsed){
                prefs[key] = parsed[key];
            }
        }catch(e){
            /* ignore a corrupted prefs blob, keep defaults */
        }
    }

    function applyPrefs(){
        var minimap = document.getElementById('minimap');
        var killFeed = document.getElementById('killFeed');
        var joystickBase = document.getElementById('joystickBase');

        if(minimap){
            minimap.style.display = prefs.showMinimap ? 'block' : 'none';
        }
        if(killFeed){
            killFeed.style.display = prefs.showKillFeed ? 'flex' : 'none';
        }
        if(joystickBase){
            joystickBase.style.transform = 'scale(' + prefs.joystickSize + ')';
        }
        if(window.PlayerController && PlayerController.setLookSensitivity){
            PlayerController.setLookSensitivity(prefs.lookSensitivity);
        }
    }

    function setHealth(current, max){
        if(!healthFill)return;
        var pct = Math.max(0, Math.min(100, (current / max) * 100));
        healthFill.style.width = pct + '%';
    }

    function setAmmo(current, max){
        if(!ammoText)return;
        ammoText.textContent = current + ' / ' + max;
    }

    function setReloading(isReloading){
        if(!reloadLabel)return;
        reloadLabel.style.opacity = isReloading ? '1' : '0';
    }

    function showHitMarker(){
        if(!prefs.showHitMarkers || !hitMarker)return;
        hitMarker.classList.add('show');
        setTimeout(function(){
            hitMarker.classList.remove('show');
        }, 180);
    }

    function pushKillFeed(text){
        if(!prefs.showKillFeed || !killFeedList)return;

        var row = document.createElement('div');
        row.className = 'kill-feed-row';
        row.textContent = text;
        killFeedList.appendChild(row);

        setTimeout(function(){
            row.remove();
        }, 4000);
    }

    return {
        init: init,
        setHealth: setHealth,
        setAmmo: setAmmo,
        setReloading: setReloading,
        showHitMarker: showHitMarker,
        pushKillFeed: pushKillFeed
    };

})();
