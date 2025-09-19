const fetchDishImage = async (dishName) => {
  try {
    // If no access key is configured, skip remote call and return null
    if (!import.meta.env || !import.meta.env.VITE_UNSPLASH_ACCESS_KEY) {
      return null;
    }
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(dishName + ' food')}&per_page=1`,
      {
        headers: {
          'Authorization': `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    const data = await response.json();
    return data.results[0]?.urls?.regular || null;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
};

export default fetchDishImage;
