
$(function(){
  initcl();
});

//클릭 콜백
//마우스 오버 콜백

var layerByDepth = new Map();
function initcl()
{
  $('.cl').hover(
  function (e) {
    var clName = $(this).attr('cl-name');
    var clDepth = $(this).attr('cl-depth')
    //console.log(clName + ' - ' + clDepth);
    layerByDepth[clName] = this;
    mostTopVisible();

  },
  function (e) {
    var clName = $(this).attr('cl-name');
    var clDepth = $(this).attr('cl-depth')
    delete layerByDepth[clName];
    $(this).removeClass("clfocus");
    mostTopVisible();
  });

  $('.cl').click(
    function (e) {
      var tthis = this;
      var clName = mostTopVisible();
      if(clName == $(this).attr('cl-name'))
        clNameClick(clName);
    }
  );
}


function mostTopVisible(func)
{
  var mostTop = true;
  var iter = layerByDepth.keys();
  var len = 0;

  var mostTopElement = undefined;
  var mostTopDepth = -1;

  var path = '';
  for (var key in layerByDepth) {
    var name = $(layerByDepth[key]).attr('cl-name');
    var depth = $(layerByDepth[key]).attr('cl-depth');
    $(layerByDepth[key]).removeClass("clfocus");
    depth = Number(depth);
    if(depth > mostTopDepth)
    {
      mostTopDepth = depth;
      mostTopElement = layerByDepth[key];
    }
    path = path + name  + ' > ' + depth + '<br/> ';
    len++;
  }

  //console.log('len - '+len);

  if(mostTopElement != undefined)
  {
    $(mostTopElement).addClass("clfocus");

    var position = $(mostTopElement).offset();
    position['left'] = position['left'] + $(mostTopElement).width() + 20;
    position['top'] = position['top'] - 20;
    //console.log(position['left'] + ' , ' + position['top']);
    $('#block_info_tag').css(position);
    // $('#block_info').css('left', '300px');
    $('#block_info_tag').css('visibility', 'visible');
    var clName = $(mostTopElement).attr('cl-name');
    $('#block_info_tag_path').html(path);
    $('#block_info_tag_text').html(clName);

    //console.log(func);
    var name = $(mostTopElement).attr('cl-name');
    return name;
  }
  if(len == 0)
  {
    $('#block_info_tag').css('visibility', 'hidden');
  }
  return null;
}
