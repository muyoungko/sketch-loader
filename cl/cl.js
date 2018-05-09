
$(function(){
  initcl();
});
var layerByDepth = new Map();
function initcl()
{
  $('.cl').hover(
  function () {
    var clName = $(this).attr('cl-name');
    var clDepth = $(this).attr('cl-depth')
    //console.log(clName + ' - ' + clDepth);
    layerByDepth[clName] = this;
    mostTopVisible(this);
  },
  function () {
    var clName = $(this).attr('cl-name');
    var clDepth = $(this).attr('cl-depth')
    delete layerByDepth[clName];
    $(this).removeClass("clfocus");
    mostTopVisible(this);
  });
}

console.log(layerByDepth.keys().length);

function mostTopVisible(element)
{
  var mostTop = true;
  var iter = layerByDepth.keys();
  var len = 0;

  var mostTopElement = undefined;
  var mostTopDepth = -1;
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

    len++;
  }

  console.log('len - '+len);

  if(mostTopElement != undefined)
  {
    $(mostTopElement).addClass("clfocus");
    $('#block_info').css('visibility', 'visible');
  }
  if(len == 0)
  {
    $(element).removeClass("clfocus");
    $('#block_info').css('visibility', 'hidden');
  }

}
