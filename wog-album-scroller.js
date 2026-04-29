    const albumContainer = document.querySelector('.album-container-wrapper');

    // Enable horizontal scrolling with mouse wheel and dragging
    albumContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      albumContainer.scrollLeft += e.deltaY;
    });

    let isDown = false;
    let startX;
    let scrollLeft;

    albumContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      albumContainer.classList.add('active');
      startX = e.pageX - albumContainer.offsetLeft;
      scrollLeft = albumContainer.scrollLeft;
    });

    albumContainer.addEventListener('mouseleave', () => {
      isDown = false;
      albumContainer.classList.remove('active');
    });

    albumContainer.addEventListener('mouseup', () => {
      isDown = false;
      albumContainer.classList.remove('active');
    });

    albumContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - albumContainer.offsetLeft;
      const walk = (x - startX) * 2; // Multiply for faster scroll
      albumContainer.scrollLeft = scrollLeft - walk;
    });
