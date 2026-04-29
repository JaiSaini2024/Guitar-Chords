(function() {
    const root = document.getElementById('carousel');
    if (!root) return;

    const label = root.getAttribute('data-label') || "Hindi Praise Song";
    const count = root.getAttribute('data-count') || 10;
    let imgSelected = 0;
    let elementImg = [];

    window.loadCarousel = function(json) {
        const entries = json.feed.entry || [];
        
        // 1. A to Z Sorting[cite: 1]
        entries.sort((a, b) => a.title.$t.localeCompare(b.title.$t));

        let html = "";
        entries.forEach((e, index) => {
            const title = e.title.$t;
            const link = e.link.find(l => l.rel === 'alternate').href;
            const thumb = e.media$thumbnail ? e.media$thumbnail.url.replace('s72-c', 's600') : 'https://via.placeholder.com/600x400';

            html += `
                <div class="slideImg" data-index="${index}">
                    <img src="${thumb}" alt="${title}">
                    <div class="slide-info">
                        <a href="${link}" class="slide-title">${title}</a>
                    </div>
                </div>`;
        });
        
        root.innerHTML = html;
        elementImg = root.getElementsByClassName('slideImg');
        normalizeSlide();
        
        // Auto setup clicks
        Array.from(elementImg).forEach(el => {
            el.addEventListener('click', (e) => {
                imgSelected = parseInt(el.getAttribute('data-index'));
                normalizeSlide();
            });
        });
    };

    window.moveSlide = function(dir) {
        imgSelected += dir;
        if (imgSelected < 0) imgSelected = 0;
        if (imgSelected >= elementImg.length) imgSelected = elementImg.length - 1;
        normalizeSlide();
    };

    // CodePen Normalization Logic
    function normalizeSlide() {
        if (!elementImg.length) return;
        
        Array.from(elementImg).forEach(el => {
            el.classList.remove("hideLeft","prevLeftSecond","prev","selected","next","nextRightSecond","hideRight");
        });

        elementImg[imgSelected].classList.add("selected");

        if (imgSelected > 0) elementImg[imgSelected-1]?.classList.add("prev");
        if (imgSelected > 1) elementImg[imgSelected-2]?.classList.add("prevLeftSecond");
        if (imgSelected > 2) elementImg[imgSelected-3]?.classList.add("hideLeft");

        if (imgSelected + 1 < elementImg.length) elementImg[imgSelected+1]?.classList.add("next");
        if (imgSelected + 2 < elementImg.length) elementImg[imgSelected+2]?.classList.add("nextRightSecond");
        if (imgSelected + 3 < elementImg.length) elementImg[imgSelected+3]?.classList.add("hideRight");
    }

    const script = document.createElement('script');
    script.src = `/feeds/posts/summary/-/${encodeURIComponent(label)}?alt=json-in-script&max-results=${count}&callback=loadCarousel`;
    document.body.appendChild(script);
})();
