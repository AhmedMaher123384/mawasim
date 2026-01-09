function Media() {
  const mediaItems = [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
      title: 'مشروع ١'
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
      title: 'مشروع ٢'
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
      title: 'مشروع ٣'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">مكتبة الصور والفيديوهات</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mediaItems.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-800 text-right">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Media;
