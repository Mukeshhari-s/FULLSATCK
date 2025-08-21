const fetchDishImage = async (dishName) => {
  try {
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
