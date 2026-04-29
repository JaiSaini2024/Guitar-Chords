(function() {
    const track = document.getElementById('wogSortTrack');
    if(!track) return;
    const label = track.getAttribute('data-label');
    const count = track.getAttribute('data-count') || 10;

    document.getElementById('wogLabelHeading').innerText = label;
    document.getElementById('wogLabelLink').href = `/search/label/${encodeURIComponent(label)}`;

    window.wogScroll = function(dir) {
        const scrollStep = track.clientWidth * 0.8;
        track.scrollBy({ left: dir * scrollStep, behavior: 'smooth' });
    };

    const feedUrl = `/feeds/posts/summary/-/${encodeURIComponent(label)}?alt=json-in-script&max-results=${count}&callback=loadSortedSlider`;

    window.loadSortedSlider = function(json) {
        const entries = json.feed.entry || [];
        entries.sort((a, b) => a.title.$t.toLowerCase().localeCompare(b.title.$t.toLowerCase()));

        let html = "";
        entries.forEach(e => {
            const title = e.title.$t;
            const link = e.link.find(l => l.rel === 'alternate').href;
            const thumb = e.media$thumbnail ? e.media$thumbnail.url.replace('s72-c', 's400') : 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjcpq6A0XpwnhevzSY9yXW2EZ_DP8fgVGLcgZT3m_JrNd-Rhvz1_zHBc4Gpon5HRsNssedmwT_zhEPTeDB0DWkn74TccwY3a4XznVDHKbAzVhQaSmgfmozoOkQ9JpxlPk4K65rmCS-57cMi8VSEH6TAL6_bNzR6lN4yyMVO1zaTnLY0KQ4UWJdlYBq1dRbl/s1080/woglac.webp';

            html += `
                <div class="wog-slide">
                    <a href="${link}"><img src="${thumb}" alt="${title}"></a>
                    <div class="wog-slide-info">
                        <a href="${link}" class="wog-slide-title">${title}</a>
                    </div>
                </div>`;
        });
        track.innerHTML = html || "<p style='padding:20px;'>No posts found.</p>";
    };

    const script = document.createElement('script');
    script.src = feedUrl;
    document.body.appendChild(script);
})();
