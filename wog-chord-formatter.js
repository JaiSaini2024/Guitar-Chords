function convertSongChords() {
    const songRoot = document.getElementById('song-root');
    if (!songRoot) return;

    songRoot.querySelectorAll('p').forEach(paragraph => {
        let html = paragraph.innerHTML;

        // Smart Regex: Chord aur uske baad wale spaces ko capture karega
        html = html.replace(/\{([^}]+)\}(\s*)/g, function(match, chord, space) {
            // Agar space hai, toh use &nbsp; mein badal dein taki width bani rahe
            let spaceHtml = '';
            if (space.length > 0) {
                // Har ek space ke liye ek &nbsp; aur thodi extra doori
                spaceHtml = space.replace(/ /g, '&nbsp;').replace(/\u00A0/g, '&nbsp;');
            }

            // Agar chord ke baad space hai, toh 'has-space' class lagayenge
            const className = space.length > 0 ? "cw has-space" : "cw";
            
            return `<span class="${className}"><span class="chord">${chord.trim()}</span></span>${spaceHtml}`;
        });

        paragraph.innerHTML = html;
    });
}
window.addEventListener('DOMContentLoaded', convertSongChords);
