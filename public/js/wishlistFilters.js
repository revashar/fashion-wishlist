document.addEventListener("DOMContentLoaded", () => {
  // Get filters if they exist on the page
  const colorFilter = document.getElementById("filter-color");
  const categoryFilter = document.getElementById("filter-category");
  const seasonFilter = document.getElementById("filter-season");
  const brandFilter = document.getElementById("filter-brand");
  const userFilter = document.getElementById("filter-user"); // new for brand page
  const applyBtn = document.getElementById("apply-filters");
  const resetBtn = document.getElementById("reset-filters");
  const items = document.querySelectorAll(".wishlist-item");

  function applyFilters() {
    const color = colorFilter?.value;
    const category = categoryFilter?.value;
    const season = seasonFilter?.value;
    const brand = brandFilter?.value;
    const user = userFilter?.value;

    items.forEach(item => {
      const matchesColor = !color || (item.dataset.color && item.dataset.color.includes(color));
      const matchesCategory = !category || item.dataset.category === category;
      const matchesSeason = !season || (item.dataset.season && item.dataset.season.includes(season));
      const matchesBrand = !brand || item.dataset.brand === brand;
      const matchesUser = !user || item.dataset.user === user;

      if (matchesColor && matchesCategory && matchesSeason && matchesBrand && matchesUser) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });
  }

  function resetFilters() {
    if(colorFilter) colorFilter.value = "";
    if(categoryFilter) categoryFilter.value = "";
    if(seasonFilter) seasonFilter.value = "";
    if(brandFilter) brandFilter.value = "";
    if(userFilter) userFilter.value = "";
    applyFilters();
  }

  if(applyBtn) applyBtn.addEventListener("click", applyFilters);
  if(resetBtn) resetBtn.addEventListener("click", resetFilters);
});
