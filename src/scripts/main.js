document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const diseasePages = [
        'cancer',
        'obesity',
        'diabetes',
        'asthma',
        'hypertension',
        'arthritis'
    ];

    // Handle navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', async (e) => {
            const href = link.getAttribute('href');
            if (href === '#gdp') {
                e.preventDefault();
                try {
                    const response = await fetch('html/world_health.html');
                    const content = await response.text();
                    mainContent.innerHTML = content;
                } catch (error) {
                    console.error('Error loading content:', error);
                    mainContent.innerHTML = '<p>Error loading content. Please try again.</p>';
                }
            } else if (diseasePages.includes(href.replace('#', ''))) {
                e.preventDefault();
                try {
                    const response = await fetch(`html/${href.replace('#', '')}.html`);
                    const content = await response.text();
                    mainContent.innerHTML = content;
                } catch (error) {
                    console.error('Error loading content:', error);
                    mainContent.innerHTML = '<p>Error loading disease content. Please try again.</p>';
                }
            }
        });
    });

    // Load GDP content by default if URL has #gdp hash
    if (window.location.hash === '#gdp') {
        document.querySelector('a[href="#gdp"]').click();
    }
});
