Vue.directive('linkified', function (el, binding) {
  el.innerHTML = linkifyHtml(el.innerHTML, binding.value)
});

// Vue.use(VueMarkdown);

var app = new Vue({
  el: '#app',
  data: {
    days_of_habits: 25,
    dates: [],
    newHabit: '',
    icons: {
      ui: 'oi-clock',
      nui: 'oi-warning',
      uni: 'oi-question-mark',
      nuni: 'oi-trash',
    },
    editing: null,
    emptyData: {
      habits: [],
      lists: [
        {
          id: 'ui',
          items: [],
          active: false,
        },
        {
          id: 'nui',
          items: [],
          active: false,
        },
        {
          id: 'uni',
          items: [],
          active: false,
        },
        {
          id: 'nuni',
          items: [],
          active: false,
        },
      ],
    },
    data: {}
  },
  created: function () {
    this.data = this.emptyData;

    function cleanUp(items) {
      newItems = [];
      for (var j = 0; j < items.length; j++) {
        if (items[j] && !items[j].closedTs) {
          newItems.push(items[j]);
        }
      }
      return newItems;
    }
    function getDaysSinceFirstHabitDate(habits) {
      var dates = []
      for (var i = 0; i < habits.length; i++) {
        dates = habits[i].dates.concat(dates)
      }
      return Math.ceil((new Date() - new Date(dates.sort()[0])) / (1000*60*60*24)) + 1 | 2;
    }
    function calcDates(days_of_habits, days) {
      date = new Date();
      date.setDate(date.getDate() - days);
      var dates = []
      for (var i = 0; i <= days_of_habits; i++) {
        date.setDate(date.getDate() + 1);
        dates.push(new Date(date.toDateString()).getTime());
      }
      return dates;
    }
    this.dates = calcDates(this.days_of_habits, 2);

    var _self = this;
    chrome.storage.sync.get('data', function(data) {
      if (data.data) {
        _self.data = data.data;
        for (var i = 0; i < _self.data.lists.length; i++) {
          _self.data.lists[i].items = cleanUp(_self.data.lists[i].items);
        }
        _self.data.habits = cleanUp(_self.data.habits);
        var daysSince = getDaysSinceFirstHabitDate(_self.data.habits);
        _self.dates = calcDates(_self.days_of_habits, Math.min(_self.days_of_habits, daysSince));
      } else {
        _self.data = _self.emptyData;
      }
    });
  },
  methods: {
    exportFile: function() {
      var element = document.createElement('a');
      var text = JSON.stringify(this.data, null, 2);
      element.setAttribute('href',     'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      element.setAttribute('download', 'tasks.json');
      element.setAttribute('style',    'display: none;');
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },
    importFile: function() {
      var _self = this;
      var fileUpload = document.getElementById("get_the_file");
      fileUpload.addEventListener("change", function() {
        var file_to_read = document.getElementById("get_the_file").files[0];
        var fileread = new FileReader();
        fileread.onload = function(e) {
          _self.data = JSON.parse(e.target.result);
          _self.save();
          location.reload();
        };
        fileread.readAsText(file_to_read);
      });
      fileUpload.click();
    },
    isMon: function (ts) {
      return new Date(ts).getDay() === 1;
    },
    isToday: function (ts) {
      return new Date(ts).getDate() === new Date().getDate();
    },
    getDate: function (ts) {
      return new Date(ts).toLocaleDateString(
        navigator.language || navigator.languages[0],
        { day: '2-digit', month: '2-digit' }
      );
    },
    toggleHabit: function(habit, ts) {
      var idx = habit.dates.indexOf(ts);
      if (idx > -1) {
        habit.dates.splice(idx, 1);
        this.save();
        return;
      }

      habit.dates.push(ts);
      this.save();
    },
    addHabit: function () {
      if (!this.newHabit) {
        return;
      }

      this.data.habits.unshift({name: this.newHabit, dates: [], active: false});
      this.newHabit = '';
      this.save();
    },
    closeHabit: function (habit) {
      habit.closedTs = new Date().getTime();
      this.save();
    },
    toggleItem: function(item) {
      this.editing = (this.editing == item.id) ? null : item.id;
      if (this.editing) {
        this.$nextTick(function () {
          this.$refs["textarea_" + item.id][0].focus();
        });
      } else {
        item.text = item.text.trim().replace(/\s+/g, " ");
        this.save();
      }
    },
    add: function (list) {
      if (!list.text) {
        return;
      }

      list.items.unshift({
        text: list.text,
        id: new Date().getTime()
      });
      list.text = '';
      this.save();
    },
    remove: function (list, id) {
      for (var i = 0; i < list.items.length; i++) {
        if (list.items[i].id == id) {
          list.items[i].closedTs = new Date().getTime();
          break;
        }
      }
      this.save();
      this.$forceUpdate(); 
    },
    save: function() {
      chrome.storage.sync.set({data: this.data});
      this.$forceUpdate(); 
    },
    reset: function() {
      if (confirm('Are you sure you want to delete all the data?')) {
        this.data = this.emptyData;
        this.save();
      }
    },
  }
});
