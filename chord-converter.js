// chord-converter.js

function convertSongChords() {
    const songRoot = document.getElementById('song-root');
    if (!songRoot) return;

    songRoot.querySelectorAll('p').forEach(paragraph => {
        let html = paragraph.innerHTML;

        html = html.replace(/\{([^}]+)\}(\s*)/g, function(match, chord, space) {

            let spaceHtml = '';
            if (space.length > 0) {
                spaceHtml = space.replace(/ /g, '&nbsp;');
            }

            const className = space.length > 0 ? "cw has-space" : "cw";
            
            return `<span class="${className}"><span class="chord">${chord.trim()}</span></span>${spaceHtml}`;
        });

        paragraph.innerHTML = html;
    });
}

// ✅ Firebase + DOM ready ke baad run
if (window.appReady) {
    window.appReady.then(convertSongChords);
} else {
    document.addEventListener('DOMContentLoaded', convertSongChords);
}
