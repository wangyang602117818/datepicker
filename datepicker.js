(function (win, $) {
    //默认配置
    var defaults = {
        showFormat: "yyyy-MM-dd",       //界面展示的格式 yyyy-MM-dd|yyyy/MM/dd|dd Month yyyy hh:mm:ss
        start: "1900-01-01 00:00:00",      //start: new Date(),
        end: "2100-12-31 00:00:00",        //end: new Date().addYear(1)
        useFormat: "yyyy-MM-dd",           //与程序交互的时间格式 yyyy-MM-dd|yyyy/MM/dd
        lang: "en-us"                    //界面语言 en-us|zh-cn,
    };
    var script = $("script[datepicker-template]");
    var template_src = script.attr("datepicker-template");
    var css_src = script.attr("datepicker-css");
    //全局参数
    var commonlang = {
        "zh-cn": {
            week: ["日", "一", "二", "三", "四", "五", "六"],
            month: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
            title: ["年", "上一年", "下一年", "月", "上一月", "下一月"]
        },
        "en-us": {
            week: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            title: ["", "Last Year", "Next Year", "", "Last Month", "Next Month"]
        }
    },
        date = new Date(),
        curr_time_arr = [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()],  //文本框中的日期
        text_time_arr,    //保存选中日期
        start_time_arr,
        end_time_arr,
        dur = 300,        //动画速度
        start_disp_year,  //year层的起始年
        has_time = false,     //,
        template = "",
        template_data = "",
        template_year = "",
        template_month = "",
        template_hover = "",
        template_minute = "",
        template_second = "",
        template_data_regex = /<!--data_containter_start-->((.|\n|\r)*)<!--data_containter_end-->/,
        template_year_regex = /<!--year_containter_start-->((.|\n|\r)*)<!--year_containter_end-->/,
        template_month_regex = /<!--month_containter_start-->((.|\n|\r)*)<!--month_containter_end-->/,
        template_hover_regex = /<!--hover_containter_start-->((.|\n|\r)*)<!--hover_containter_end-->/,
        template_minute_regex = /<!--minute_containter_start-->((.|\n|\r)*)<!--minute_containter_end-->/,
        template_second_regex = /<!--second_containter_start-->((.|\n|\r)*)<!--second_containter_end-->/,
        timeval_regex = /\d{1,2}:(\d{1,2})?(:\d{1,2})?/,         //验证文本框的日期值,是否有时间
        time_regex = /[Hh]{1,2}:([Mm]{1,2})?(:[Ss]{1,2})?/,      //作验证日期格式是否有时间
        date_val_zh = /^(\d{2,4})([-\/\.])?(\d{1,2})?(?:[-\/\.])?(\d{1,2})?\s*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?$/,     //提取文本框的日期,针对中国时间
        date_val_en = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2,4})\s*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?$/;  //针对 dd Month yyyy hh:mm:ss 格式
    //全局对象
    var datepicker_iframe,
        datepicker,              //主日期框对象
        datepicker_time,         //时间对象
        main_data_containter,  //主数据容器对象
        con_year,
        con_month,
        con_hour,
        con_minute,
        con_second;
    var model = {};
    var that = null;    //input
    $(function () {
        begin();
    });
    $.fn.extend({
        datepicker: function () {
            this.each(function () { showDate($(this)); });
            return this;
        }
    });
    win.datepicker = function () {
        begin();
    }
    function begin() {
        datepicker_iframe = $(".datepicker_iframe");
        getTemplate();
        if (datepicker_iframe.length == 0) {
            $("body").append("<iframe class=\"datepicker_iframe\" scrolling=\"no\" style=\"position:absolute;display:none;border:0;left:50px;top:100px;width:205px;height:203px\"></iframe>");
            datepicker_iframe = $(".datepicker_iframe");
            setTimeout(function () {
                datepicker_iframe.contents().find("head").html("<link type=\"text/css\" href=\"" + css_src + "\" rel=\"stylesheet\" />");
            }, 100);  //ff iframe中加载css需要延迟
            $(document).click(function (event) {
                var srcElement = $(event.target);
                if (!srcElement.hasClass("datepicker")) datepicker_iframe.hide();
            });
        }
        $(".datepicker")
            .off()
            .on("click", function () {
                that = $(this);
                init();      //初始化一个model
                render(model);
            });
        $(".datepicker")
            .each(function () { showDate($(this)); });
    }
    //页面加载的时候，展示日期
    function showDate(that) {
        var showFormat = that.attr("date-show-format");  //显示格式
        var useFormat = that.attr("date-use-format");    //使用格式
        var dateVal = that.attr("date-val");
        if (dateVal) {
            var date = inputDateConvert(dateVal).date;
            if (!date) { that.addClass("datepicker-error-format"); return; }
            var curr_time_arr = [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
            if (showFormat) {
                var showdate = dateFormat(curr_time_arr, showFormat);
                that.val(showdate);
            } else {
                var format = getDateFormatByVal(dateVal);
                var showdate = dateFormat(curr_time_arr, format);
                that.val(showdate);
            }
            if (useFormat) {
                var useDate = dateFormat(curr_time_arr, useFormat);
                that.attr("date-val", useDate);
            }
        }
    }
    function init() {
        var options = {};
        for (var t in defaults) options[t] = defaults[t];
        has_time = false;
        options.start = that.attr("date-start") || options.start;
        options.end = that.attr("date-end") || options.end;
        options.lang = that.attr("date-lang") || options.lang;
        var dateShowFormat = that.attr("date-show-format"),
            dateUseFormat = that.attr("date-use-format"),
            dateVal = that.attr("date-val");
        if (dateVal) {
            var format = getDateFormatByVal(dateVal);
            if (!dateShowFormat) dateShowFormat = format;
            if (!dateUseFormat) dateUseFormat = format;
        } else {
            if (!dateShowFormat && dateUseFormat) dateShowFormat = dateUseFormat;
            if (!dateUseFormat && dateShowFormat) dateUseFormat = dateShowFormat;
        }
        options.showFormat = dateShowFormat || options.showFormat;
        options.useFormat = dateUseFormat || options.useFormat;
        if (time_regex.test(options.showFormat)) has_time = true;
        if (time_regex.test(options.useFormat)) has_time = true;
        if (dateVal && dateVal != '') {
            date = inputDateConvert(dateVal).date;
        } else {
            date = new Date();
        }
        if (!date) date = new Date();
        curr_time_arr = [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
        text_time_arr = curr_time_arr.slice(0);
        if (options.start instanceof Date) {
            start_time_arr = [options.start.getFullYear(), options.start.getMonth(), options.start.getDate(), options.start.getHours(), options.start.getMinutes(), options.start.getSeconds()];
        } else {
            start_time_arr = startEndDateConvert(options.start);
        }
        if (options.end instanceof Date) {
            end_time_arr = [options.end.getFullYear(), options.end.getMonth(), options.end.getDate(), options.end.getHours(), options.end.getMinutes(), options.end.getSeconds()];
        } else {
            end_time_arr = startEndDateConvert(options.end);
        }
        start_disp_year = getStartDispYear(curr_time_arr[0]);
        var top = that.offset().top + that.outerHeight(),
            left = that.offset().left;
        model = {
            defaults: options,
            commonlang: commonlang,
            curr_time_arr: curr_time_arr,
            start_time_arr: start_time_arr,
            end_time_arr: end_time_arr,
            start_disp_year: start_disp_year,
            has_time: has_time,
            getMonthDays: getMonthDays,
            isDateDay: isDateDay,
            isWeekend: isWeekend,
            isDateToday: isDateToday,
            isDayDisabled: isDayDisabled,
            monthFormat: monthFormat,
            top: top,
            left: left
        };
    }
    function render(model) {
        var templateObj = parseTemplate(template, model);
        datepicker_iframe.contents().find("body").html(templateObj);
        datepicker_iframe.css({ top: model.top, left: model.left, display: "inline" });
        bindEvent();
    }
    function bindEvent() {
        datepicker = datepicker_iframe.contents().find(".datepicker");
        main_data_containter = datepicker.find(".datepicker_maindata_containter");
        con_year = datepicker.find(".datepicker_year_layer");
        con_month = datepicker.find(".datepicker_month_layer");
        con_hour = datepicker.find(".datepicker_hover_layer");
        con_minute = datepicker.find(".datepicker_minute_layer");
        con_second = datepicker.find(".datepicker_second_layer");
        changeHeight();
        //5个div层
        datepicker.find(".title_year").off().on("click", showYearLayer);
        datepicker.find(".title_month").off().on("click", showMonthLayer);
        datepicker.find("#hover_txt").off().on("click", showHoverLayer).on("input propertychange", function () {
            curr_time_arr[3] = $(this).find("input").val();
            writeDate(curr_time_arr);
        });
        datepicker.find("#minute_txt").off().on("click", showMinuteLayer).on("input propertychange", function () {
            curr_time_arr[4] = $(this).find("input").val();
            writeDate(curr_time_arr);
        });
        datepicker.find("#second_txt").off().on("click", showSecondLayer).on("input propertychange", function () {
            curr_time_arr[5] = $(this).find("input").val();
            writeDate(curr_time_arr);
        });
        //选中了一个,冒泡
        datepicker.off().on("click", function (event) {
            var srcElement = $(event.target);
            if (srcElement.hasClass("disabled")) return false;
            var data = srcElement.text();
            if (srcElement.hasClass("tag_day")) {
                if (data <= 31 && data > 0) {
                    curr_time_arr[2] = data;
                    if (that[0].hasAttribute("date-dblclick") && !srcElement.hasClass("today") && has_time) {
                        text_time_arr = curr_time_arr.slice(0);
                        main_data_containter.find(".tag_day").removeClass("today");
                        srcElement.addClass("today");
                    } else {
                        datepicker_iframe.hide();
                    }
                    writeDate(curr_time_arr);
                }
            }
            if (srcElement.hasClass("tag_year")) {
                var curr_year = curr_time_arr[0];  //首先保存当前年
                curr_time_arr[0] = data;   //吧全局的年份修改了
                text_time_arr[0] = data;   //选中年
                if (data > curr_year) {
                    changeMainData("left");
                } if (data < curr_year) {
                    changeMainData("right");
                }
                showYearLayer();
                writeDate(curr_time_arr);
            }
            if (srcElement.hasClass("tag_month")) {
                for (var i = 0; i < model.commonlang[model.defaults.lang].month.length; i++) {
                    if (model.commonlang[model.defaults.lang].month[i] == data) {
                        var curr_month = curr_time_arr[1];   //保存当前的月份
                        curr_time_arr[1] = i;  //修改全局月份
                        text_time_arr[1] = i;   //选中月
                        if (i > curr_month) {
                            changeMainData("left");
                        }
                        if (i < curr_month) {
                            changeMainData("right");
                        }
                        showMonthLayer();
                        writeDate(curr_time_arr);
                    }
                }
            }
            if (srcElement.hasClass("tag_hover")) {
                if (data >= 0 && data <= 23) {
                    datepicker.find(".hour").val(data);
                    curr_time_arr[3] = data;
                    text_time_arr[3] = data;
                    showHoverLayer();
                    writeDate(text_time_arr);
                }
            }
            if (srcElement.hasClass("tag_minute")) {
                if (data >= 0 && data <= 55) {
                    datepicker.find(".minute").val(data);
                    curr_time_arr[4] = data;
                    text_time_arr[4] = data;
                    showMinuteLayer();
                    writeDate(text_time_arr);
                }
            }
            if (srcElement.hasClass("tag_second")) {
                if (data >= 0 && data <= 55) {
                    datepicker.find(".second").val(data);
                    curr_time_arr[5] = data;
                    text_time_arr[5] = data;
                    showSecondLayer();
                    writeDate(text_time_arr);
                }
            }
        });
        //4个按钮
        datepicker.find(".last_year").off().on("click", lastYear);
        datepicker.find(".next_year").off().on("click", nextYear);
        datepicker.find(".last_month").off().on("click", lastMonth);
        datepicker.find(".next_month").off().on("click", nextMonth);
        that.off("input propertychange").on("input propertychange", function () {
            that = $(this);
            var val = that.val();
            if (trim(val) == "") {
                that.attr("date-val", "");
                that.removeClass("datepicker-error-format");
            } else {
                if (!inputDateConvert(val).date) {
                    that.addClass("datepicker-error-format");
                } else {
                    that.removeClass("datepicker-error-format");
                }
            }
            init();
            setTimeout(retrieveDate, 200);
        });
    }
    //把时间从文本框，反向写入到datepicker
    function retrieveDate() {
        var date = inputDateConvert(that.val()).date;
        if (date && !isNaN(date.getTime())) {
            var direct = "";
            var year = date.getFullYear(),
                month = date.getMonth(),
                day = date.getDate(),
                hour = date.getHours(),
                minuts = date.getMinutes(),
                second = date.getSeconds();
            var modifyDate = new Date(year, month, day);
            var originDate = new Date(curr_time_arr[0], curr_time_arr[1], curr_time_arr[2]);
            if (modifyDate > originDate) direct = "left";
            if (modifyDate < originDate) direct = "right";
            curr_time_arr = [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]
            var usedate = dateFormat(curr_time_arr, model.defaults.useFormat);
            that.attr("date-val", usedate);
            text_time_arr = curr_time_arr.slice(0);
            model.curr_time_arr = curr_time_arr;
            datepicker.find("#hover_txt .hour").val(monthFormat(curr_time_arr[3], 2));
            datepicker.find("#minute_txt .minute").val(monthFormat(curr_time_arr[4], 2));
            datepicker.find("#second_txt .second").val(monthFormat(curr_time_arr[5], 2));
            if (direct) changeMainData(direct);
        }
    }
    //往文本框写入日期时间
    function writeDate(curr_time_arr) {
        if (!curr_time_arr) {
            curr_time_arr = [date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
        }
        var usedate = dateFormat(curr_time_arr, model.defaults.useFormat);
        var showdate = dateFormat(curr_time_arr, model.defaults.showFormat);
        that.val(showdate);
        that.attr("date-val", usedate);
        that.removeClass("datepicker-error-format");
    }
    //显示年份div
    function showYearLayer() {
        con_year.stop(); con_month.stop();
        //让year层在month层上面
        con_year.css({ "z-index": getMaxZIndex() + 1 });
        if (con_year.attr("flag") == "0") {   //flag=0;表示年div未显示
            var html = $(parseTemplate(template_year, model)).html();
            con_year.html(html);
            datepicker.find(".last_month,.next_month").addClass("disabled");
            datepicker.find(".last_year,.next_year").removeClass("disabled");
            con_year.animate({ top: "27px" }, dur, function () {
                con_month.css({ top: "-" + parseInt(main_data_containter.css("height"), 10) + "px" }).attr("flag", "0");
                hiddenTimePanel();
                con_year.attr("flag", "1");
            });
        } else {
            datepicker.find(".last_month,.next_month").removeClass("disabled");
            con_year.animate({ top: "-" + parseInt(main_data_containter.css("height"), 10) + "px" }, dur);
            con_year.attr("flag", "0");
        }
    }
    //显示月份div
    function showMonthLayer() {
        con_year.stop(); con_month.stop();
        con_month.css({ "z-index": getMaxZIndex() + 1 });  //让moth层在year层上面
        if (con_month.attr("flag") == "0") {   //flag=0;表示月div未显示
            var html = $(parseTemplate(template_month, model)).html();
            con_month.html(html);
            datepicker.find(".last_year,.next_year,.last_month,.next_month").addClass("disabled");
            con_month.animate({ top: "27px" }, dur, function () {
                con_year.css({ top: "-" + parseInt(main_data_containter.css("height"), 10) + "px" }).attr("flag", "0");
                hiddenTimePanel();
                con_month.attr("flag", "1");
            });
        } else {
            datepicker.find(".last_year,.next_year,.last_month,.next_month").removeClass("disabled");
            con_month.animate({ top: "-" + parseInt(main_data_containter.css("height"), 10) + "px" }, dur);
            con_month.attr("flag", "0");
        }
    }
    //显示小时div
    function showHoverLayer() {
        con_hour.css("z-index", getMaxZIndex() + 1);
        if (con_hour.attr("flag") == "0") {
            var html = $(parseTemplate(template_hover, model)).html();
            con_hour.html(html);
            datepicker.find(".last_year,.next_year,.last_month,.next_month").addClass("disabled");
            con_hour.animate({ bottom: "21px" }, dur, function () {
                $(this).attr("flag", "1");
                con_minute.css("bottom", "-176px").attr("flag", "0");
                con_second.css("bottom", "-176px").attr("flag", "0");
                hiddenDatePanel();
            });
        } else {
            datepicker.find(".last_year,.next_year,.last_month,.next_month").removeClass("disabled");
            con_hour.animate({ bottom: "-176px" }, dur, function () { $(this).attr("flag", "0") });
        }
    }
    //显示分钟div
    function showMinuteLayer() {
        con_minute.css("z-index", getMaxZIndex() + 1);
        if (con_minute.attr("flag") == "0") {
            var html = $(parseTemplate(template_minute, model)).html();
            con_minute.html(html);
            datepicker.find(".last_year,.next_year,.last_month,.next_month").addClass("disabled");
            con_minute.animate({ bottom: "21px" }, dur, function () {
                $(this).attr("flag", "1");
                con_hour.css("bottom", "-176px").attr("flag", "0");
                con_second.css("bottom", "-176px").attr("flag", "0");
                hiddenDatePanel();
            });
        } else {
            datepicker.find(".last_year,.next_year,.last_month,.next_month").removeClass("disabled");
            con_minute.animate({ bottom: "-176px" }, dur, function () { $(this).attr("flag", "0") });
        }
    }
    function showSecondLayer() {
        con_second.css("z-index", getMaxZIndex() + 1);
        if (con_second.attr("flag") == "0") {
            var html = $(parseTemplate(template_second, model)).html();
            con_second.html(html);
            datepicker.find(".last_year,.next_year,.last_month,.next_month").addClass("disabled");
            con_second.animate({ bottom: "21px" }, dur, function () {
                $(this).attr("flag", "1");
                con_hour.css("bottom", "-176px").attr("flag", "0");
                con_minute.css("bottom", "-176px").attr("flag", "0");
                hiddenDatePanel();
            });
        } else {
            datepicker.find(".last_year,.next_year,.last_month,.next_month").removeClass("disabled");
            con_second.animate({ bottom: "-176px" }, dur, function () { $(this).attr("flag", "0") });
        }
    }
    //上一年
    function lastYear() {
        if ($(this).hasClass("disabled")) return;
        if (isYearDisplay()) {    //year层目前在展现
            showNextYear("right");
            return false;
        }
        --curr_time_arr[0];
        changeMainData("right");  //动画改变日期面板
    }
    //下一年
    function nextYear() {
        if ($(this).hasClass("disabled")) return;
        if (isYearDisplay()) {   //year层目前在展现
            showNextYear("left");
            return false;
        }
        ++curr_time_arr[0];
        changeMainData("left");  //动画改变日期面板
    }
    //上一月
    function lastMonth() {
        if ($(this).hasClass("disabled")) return;
        --curr_time_arr[1];
        if (curr_time_arr[1] < 0) {
            curr_time_arr[0]--;
            curr_time_arr[1] = 11;
        }
        changeMainData("right");//动画改变日期面板
    }
    //下一月
    function nextMonth() {
        if ($(this).hasClass("disabled")) return;
        ++curr_time_arr[1];
        if (curr_time_arr[1] > 11) {  //该跳到下一年了
            curr_time_arr[0]++;
            curr_time_arr[1] = 0;
        }
        changeMainData("left");
    }
    function showNextYear(direction) {
        if (direction == "left") {
            model.start_disp_year += 16;
            con_year = $(parseTemplate(template_year, model)).css({ "left": datepicker.css("width"), "top": "27px" });
            if (needAddHeight()) con_year.addClass("mainyear_height1");
            datepicker.append(con_year);
            var year_containter = datepicker.find(".datepicker_year_layer");  //获取2个year层
            //去掉原来的
            year_containter.filter("[flag=1]").animate({ left: "-" + datepicker.css("width") }, dur, function () {
                $(this).remove();
            });
            //添加新的
            year_containter.filter("[flag=0]").animate({ left: 0 }, dur).attr("flag", "1");
        } else {
            model.start_disp_year -= 16;
            con_year = $(parseTemplate(template_year, model)).css({ "right": datepicker.css("width"), "top": "27px" });
            if (needAddHeight()) con_year.addClass("mainyear_height1");
            datepicker.append(con_year);
            var year_containter = datepicker.find(".datepicker_year_layer");  //获取2个year层
            year_containter.filter("[flag=1]").animate({ right: "-" + datepicker.css("width") }, dur, function () {
                $(this).remove();
            });
            year_containter.filter("[flag=0]").animate({ right: 0 }, dur).attr("flag", "1");
        }
    }
    //改变主日期面板,direction=动画方向
    function changeMainData(direction) {
        datepicker.find(".title_year").text(curr_time_arr[0] + model.commonlang[model.defaults.lang].title[0]);
        datepicker.find(".title_month").text(model.commonlang[model.defaults.lang].month[curr_time_arr[1]].substring(0, 6) + model.commonlang[model.defaults.lang].title[3]);
        var datepicker_width = datepicker.css("width");  //主日期框宽度(数据面板的偏移量)
        var dataEle = $(parseTemplate(template_data, model)); //创建
        //在改变日期数据面板时,每个月天数不一样,有可能高度发生变化
        changeHeight();
        if (direction == "left") {
            dataEle.css({ left: datepicker_width }).attr("flag", "0");  //创建日期数据主面板element
            main_data_containter.append(dataEle);  //吧日期主面板加入父容器,这时连同以前一个数据面板，一共有2个数据面板
            var containter = datepicker.find(".datepicker_data_containter");   //获取这2个数据面板
            //2个面板一同移动
            containter.filter("[flag=1]").animate({ left: "-" + datepicker_width }, dur, function () {
                $(this).remove();
            });
            containter.filter("[flag=0]").animate({ left: 0 }, dur).attr("flag", "1");
        }
        if (direction == "right") {
            dataEle.css({ left: "-" + datepicker_width }).attr("flag", "0");
            main_data_containter.append(dataEle);
            var containter = datepicker.find(".datepicker_data_containter");
            containter.filter("[flag=1]").animate({ left: datepicker_width }, dur, function () {
                $(this).remove();
            });
            containter.filter("[flag=0]").animate({ left: 0 }, dur).attr("flag", "1");
        }
    }
    function changeHeight() {
        if (needAddHeight()) {
            datepicker.addClass("add_cal_len1");
            if (has_time) {
                datepicker.addClass("add_cal_len3");
            }
            main_data_containter.addClass("add_main_date_len1");
            con_year.addClass("mainyear_height1");
            con_month.addClass("mainmonth_height1");
        } else {
            datepicker.removeClass("add_cal_len1");
            if (has_time) {
                datepicker.removeClass("add_cal_len3");
                datepicker.addClass("add_cal_len2");
            }
            main_data_containter.removeClass("add_main_date_len1");
            con_year.removeClass("mainyear_height1");
            con_month.removeClass("mainmonth_height1");
        }
        datepicker_iframe.height(datepicker.height() + 2);
    }
    function getTemplate() {
        $.ajax({
            type: "get",
            url: template_src,
            async: false,
            success: function (data) {
                template = data;
                template_data = template_data_regex.exec(template)[1];
                template_year = template_year_regex.exec(template)[1];
                template_month = template_month_regex.exec(template)[1];
                template_hover = template_hover_regex.exec(template)[1];
                template_minute = template_minute_regex.exec(template)[1];
                template_second = template_second_regex.exec(template)[1];
            }
        });
    }
    function getMaxZIndex() {
        var zindex = 0;
        if (parseInt(con_month.css("z-index"), 10) > zindex) zindex = parseInt(con_month.css("z-index"), 10);
        if (parseInt(con_year.css("z-index"), 10) > zindex) zindex = parseInt(con_year.css("z-index"), 10);
        if (con_hour && parseInt(con_hour.css("z-index"), 10) > zindex) zindex = parseInt(con_hour.css("z-index"), 10);
        if (con_minute && parseInt(con_minute.css("z-index"), 10) > zindex) zindex = parseInt(con_minute.css("z-index"), 10);
        if (con_second && parseInt(con_second.css("z-index"), 10) > zindex) zindex = parseInt(con_second.css("z-index"), 10);
        return zindex;
    }
    //是否需要增加日期框高度
    function needAddHeight() {
        var days_week_obj = getMonthDays(curr_time_arr[0], curr_time_arr[1]);  //对象包含当月的天数，第一天周几？
        if (days_week_obj.days == 30 && days_week_obj.first_day_week == 6) return true;
        if (days_week_obj.days == 31 && (days_week_obj.first_day_week == 5 || days_week_obj.first_day_week == 6)) return true;
        return false;
    }
    //影藏时间面板
    function hiddenTimePanel() {
        if (con_hour) con_hour.css("bottom", "-176px").attr("flag", "0");
        if (con_minute) con_minute.css("bottom", "-176px").attr("flag", "0");
        if (con_second) con_second.css("bottom", "-176px").attr("flag", "0");
    }
    //隐藏年月面板
    function hiddenDatePanel() {
        con_year.css({ top: "-" + parseInt(main_data_containter.css("height"), 10) + "px" }).attr("flag", "0");
        con_month.css({ top: "-" + parseInt(main_data_containter.css("height"), 10) + "px" }).attr("flag", "0");
    }
    function dateFormat(time_arr, format) {                //格式化日期 time_arr=数组,往界面输出 格式化后的日期
        var realMonth = time_arr[1];
        if (model.commonlang)
            format = format.replace(/([Mm]onth)/, model.commonlang[model.defaults.lang].month[realMonth]);
        else {
            format = format.replace(/([Mm]onth)/, commonlang[defaults.lang].month[realMonth]);
        }
        format = format.replace(/([\W]|^)([yY]+)(\W|$)/, function (g1, g2, g3, g4) {
            return g2 + yearFormat(time_arr[0], g3.length) + g4;
        });
        format = format.replace(/([\W]|^)(M+)(\W|$)/, function (g1, g2, g3, g4) {
            return g2 + monthFormat(realMonth + 1, g3.length) + g4;
        });
        format = format.replace(/([\W]|^)([dD]+)(\W|$)/, function (g1, g2, g3, g4) {
            return g2 + monthFormat(time_arr[2], g3.length) + g4;
        });
        format = format.replace(/([\W]|^)(h+)(\W|$)/, function (g1, g2, g3, g4) {
            return g2 + monthFormat(time_arr[3], g3.length) + g4;
        });
        format = format.replace(/([\W]|^)(m+)(\W|$)/, function (g1, g2, g3, g4) {
            return g2 + monthFormat(time_arr[4], g3.length) + g4;
        });
        format = format.replace(/([\W]|^)(s+)(\W|$)/, function (g1, g2, g3, g4) {
            return g2 + monthFormat(time_arr[5], g3.length) + g4;
        });
        return format;
    }
    function getDateFormatByVal(dateVal) {
        var dateResult = inputDateConvert(dateVal);
        var format = "";
        if (dateResult.symbol == "month") {
            if (dateResult.hasDay) format += "dd";;
            if (dateResult.hasMonth) format += " Month";
            if (dateResult.hasYear) format += " yyyy";
            if (dateResult.hasHour) format += " hh";
            if (dateResult.hasMinute) format += ":mm";
            if (dateResult.hasSecond) format += ":ss";
        } else {
            if (dateResult.hasYear) format += "yyyy";
            if (dateResult.hasMonth) format += dateResult.symbol + "MM";
            if (dateResult.hasDay) format += dateResult.symbol + "dd";
            if (dateResult.hasHour) format += " hh";
            if (dateResult.hasMinute) format += ":mm";
            if (dateResult.hasSecond) format += ":ss";
        }
        return format;
    }
    //将文本框中的日期字符串转成日期对象,供默认选中用
    function inputDateConvert(dateVal) {
        var result = null;
        var year = new Date().getFullYear(),
            month = new Date().getMonth(),
            day = new Date().getDate(),
            hour = 0,
            minute = 0,
            second = 0;
        var hasYear = false,
            hasMonth = false,
            hasDay = false,
            hasHour = false,
            hasMinute = false,
            hasSecond = false,
            symbol = "";
        var resultEn = date_val_en.exec(dateVal);
        if (resultEn) {
            if (resultEn[1]) {
                day = resultEn[1]; hasDay = true;
            }
            if (resultEn[2]) {
                month = getMonthByString(resultEn[2]); hasMonth = true;
            }
            if (resultEn[3]) {
                year = resultEn[3]; hasYear = true;
            }
            if (resultEn[4]) {
                hour = resultEn[4]; hasHour = true;
            }
            if (resultEn[5]) {
                minute = resultEn[5]; hasMinute = true;
            }
            if (resultEn[6]) {
                second = resultEn[6]; hasSecond = true;
            }
            symbol = "month";
        }
        else {
            var result = date_val_zh.exec(dateVal);
            if (result) {
                if (result[1]) {
                    year = result[1]; hasYear = true;
                }
                if (result[2]) symbol = result[2];
                if (result[3]) {
                    month = result[3] - 1; hasMonth = true;
                }
                if (result[4]) {
                    day = result[4]; hasDay = true;
                }
                if (result[5]) {
                    hour = result[5]; hasHour = true;
                }
                if (result[6]) {
                    minute = result[6]; hasMinute = true;
                }
                if (result[7]) {
                    second = result[7]; hasSecond = true;
                }
            }
        }
        if (!result && !resultEn) {  //格式不对
            date = null;
        } else {
            date = new Date(year, month, day, hour, minute, second)
        }
        return {
            date: date,
            hasYear: hasYear,
            hasMonth: hasMonth,
            hasDay: hasDay,
            hasHour: hasHour,
            hasMinute: hasMinute,
            hasSecond: hasSecond,
            symbol: symbol
        }
    }
    function getMonthByString(str) {
        var monthArray = commonlang["en-us"].month;
        for (var i = 0; i < monthArray.length; i++) {
            if (str == monthArray[i]) return i;
        }
    }
    //格式化年，len=位数
    function yearFormat(year, len) {
        if (year.toString().length == len) return year.toString();
        if (year.toString().length == 4 && len == 2) return year.toString().substr(2, 2);
        if (year.toString().length == 2 && len == 4) return new Date().getFullYear().toString().substr(0, 2) + year;
        return year;
    }
    //格式化月，天，小时，
    function monthFormat(month, len) {
        if (len == 1) return month;
        if (len == 2) return month.toString().length == 1 ? "0" + month : month;
        if (len == 0) return "";
        return month;
    }
    //给日期型的添加时间项
    function addTimeFormat(format) {
        if (!time_regex.test(format)) return format + " hh:mm:ss";
        return format;
    }
    //将给出的时间范围转成数组,以便后续的比较
    function startEndDateConvert(str) {
        var result = date_val_zh.exec(str);
        var year = result[1],
            month = (result[3] - 1) < 0 ? 0 : (result[3] - 1),
            day = result[4] > 0 ? result[4] : 1,
            hour = result[5] >= 0 ? result[5] : 0,
            minute = result[6] >= 0 ? result[6] : 0,
            second = result[7] >= 0 ? result[7] : 0;
        return [year, month, day, hour, minute, second];
    }
    //获取year层的起始
    function getStartDispYear(curr_year) {
        return start_disp_year = Math.floor(curr_year / 16) * 16;
    }
    //根据年月获取该月的天数,第一天周几
    function getMonthDays(year, month) {
        var days = new Date(year, month + 1, 0).getDate();  //当前月的天数
        var first_day_week = new Date(year, month, 1).getDay();   //第一天周几
        return { days: days, first_day_week: first_day_week };
    }
    function isYearDisplay() {
        if (con_year.attr("flag") == "1") return true;
        return false;
    }
    function isMonthDisplay() {
        if (con_month.attr("flag") == "1") return true;
        return false;
    }
    function isHoverDisplay() {
        if (con_hour.attr("flag") == "1") return true;
        return false;
    }
    function isMinuteDisplay() {
        if (con_minute.attr("flag") == "1") return true;
        return false;
    }
    function isSecondDisplay() {
        if (con_second.attr("flag") == "1") return true;
        return false;
    }
    //判断给定的天是否今天,忽略年月,(只要天相等,都加上灰色背景)
    function isDay(day) {
        var date = new Date();
        if (date.getDate() == day) return true;
        return false;
    }
    //判断给定的天是否今天(年月日都相等,才加灰色背景)
    function isDateDay(day) {
        var date = new Date();
        if (curr_time_arr[0] == date.getFullYear() && curr_time_arr[1] == date.getMonth() && date.getDate() == day) return true;
        return false;
    }
    //判断当前的日期是否是文本框的值
    function isDateToday(day) {
        if (text_time_arr && text_time_arr.length > 0) {
            if (text_time_arr[0] == curr_time_arr[0] && text_time_arr[1] == curr_time_arr[1] && text_time_arr[2] == day) return true;
            return false;
        }
        return false;
    }
    //判断给的的天是否周末
    function isWeekend(day) {
        var weekday = new Date(curr_time_arr[0], curr_time_arr[1], day).getDay();
        if (weekday == 6 || weekday == 0) return true;
        return false;
    }
    //判断给的的天是否在给出的范围
    function isDayDisabled(day) {
        var days = Number(curr_time_arr[0]) * 365 + Number(curr_time_arr[1]) * 30 + day,
            startdays = Number(start_time_arr[0]) * 365 + Number(start_time_arr[1]) * 30 + Number(start_time_arr[2]),
            enddays = Number(end_time_arr[0]) * 365 + Number(end_time_arr[1]) * 30 + Number(end_time_arr[2]);
        if (days < startdays || days > enddays) return true;
        return false;
    }
    //判断给定的小时是否在给出的范围
    function isHourDisabled(hour) {
        var curr_hours = Number(curr_time_arr[0]) * 365 * 24 + Number(curr_time_arr[1]) * 30 * 24 + Number(curr_time_arr[2]) * 24 + hour,
            start_hours = Number(start_time_arr[0]) * 365 * 24 + Number(start_time_arr[1]) * 30 * 24 + start_time_arr[2] * 24 + start_time_arr[3],
            end_hours = Number(end_time_arr[0]) * 365 * 24 + Number(end_time_arr[1]) * 30 * 24 + end_time_arr[2] * 24 + end_time_arr[3];

        if (curr_hours < start_hours || curr_hours > end_hours) return true;
        return false;
    }
    //判断给定的分是否在给出的范围
    function isMinuteDisabled(minutes) {
        var curr_minutes = Number(curr_time_arr[0]) * 365 * 24 * 60 + Number(curr_time_arr[1]) * 30 * 24 * 60 + Number(curr_time_arr[2]) * 24 * 60 + curr_time_arr[3] * 60 + minutes,
            start_minutes = Number(start_time_arr[0]) * 365 * 24 * 60 + Number(start_time_arr[1]) * 30 * 24 * 60 + start_time_arr[2] * 24 * 60 + start_time_arr[3] * 60 + start_time_arr[4],
            end_minutes = Number(end_time_arr[0]) * 365 * 24 * 60 + Number(end_time_arr[1]) * 30 * 24 * 60 + end_time_arr[2] * 24 * 60 + end_time_arr[3] * 60 + end_time_arr[4];
        if (curr_minutes < start_minutes || curr_minutes > end_minutes) return true;
        return false;
    }
    //判断给定的秒是否在给出的范围
    function isSecondDsiabled(seconds) {
        var curr_seconds = Number(curr_time_arr[0]) * 365 * 24 * 60 * 60 + Number(curr_time_arr[1]) * 30 * 24 * 60 * 60 + Number(curr_time_arr[2]) * 24 * 60 * 60 + curr_time_arr[3] * 60 * 60 + curr_time_arr[4] * 60 + seconds,
            start_seconds = Number(start_time_arr[0]) * 365 * 24 * 60 * 60 + Number(start_time_arr[1]) * 30 * 24 * 60 * 60 + start_time_arr[2] * 24 * 60 * 60 + start_time_arr[3] * 60 * 60 + start_time_arr[4] * 60 + start_time_arr[5],
            end_seconds = Number(end_time_arr[0]) * 365 * 24 * 60 * 60 + Number(end_time_arr[1]) * 30 * 24 * 60 * 60 + end_time_arr[2] * 24 * 60 * 60 + end_time_arr[3] * 60 * 60 + end_time_arr[4] * 60 + end_time_arr[5];
        if (curr_seconds < start_seconds || curr_seconds > end_seconds) return true;
        return false;
    }
    //把模板解析成字符串
    function parseTemplate(html, model) {
        html = html.replace(/[\r\n]/g, "").replace(/'/g, "\\'");
        var splitRegex = /<%=(.+?)%>|<%([^=]([^%]|\n)*)%>/g,
            code = "var p = [] ;\n",
            cursor = 0,
            match = splitRegex.exec(html);
        while (match) {
            code += "p.push('" + html.slice(cursor, match.index) + "');\n";
            cursor = match.index + match[0].length;
            code += match[1] ? "p.push(" + match[1] + ");\n" : match[2] + ";\n";
            match = splitRegex.exec(html);
        }
        code += "p.push('" + html.slice(cursor) + "');\n;return p.join(\'\')";
        var fn = new Function("model", code);
        return fn(model);
    }
    function trim(str) {  //首尾去空格
        return str.replace(/(^\s*)|(\s*$)/g, "");
    }
})(window, jQuery);