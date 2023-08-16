
# Parchemin


Parchemin is a small, dependancy-free JS snippet that adds dynamic select pickers with a search bar and AJAX interactions for Boosted. It is designed to be seamlessly integrated within a Boosted-based website.

## Prerequisites

This plugin requires Boosted (5.2 or above). 

## Installation

To install Parchemin, simply add the CSS file and the script file to an HTML file.

```
<link rel="stylesheet" type="text/css" href="{{ asset('/css/parchemin.css') }}">
```

```
<script type="text/javascript" src="{{ asset('js/parchemin.js') }}"></script>
```

## Initialization
Any **select** element marked with a `parchemin` class will automatically be converted into a Parchemin select.

### Adding a search bar

To add a **live search** feature to any select, you can call the following command :

```js
const select = document.querySelector('#myselect');
parchemin.addSearch(select);
```

### Adding a live AJAX search feature

To add an **ajax** live search feature to any select, you need to make sure it has a search bar included ; then you can call the following command. 

```js
const select = document.querySelector('#myselect');
parchemin.addAjax(select, params);
```

If you need to add a search bar first, you can do a chain call, like this :

```js
const select = document.querySelector('#myselect');
parchemin.addSearch(select).addAjax(select, params);
```

The **params** variable is an object that *must* contain at least two properties.
- ***request*** is an object that, itself, contains two properties. The first one, **url**, is a *string* that contains the URL from which the data should be fetched (this URL will be appended to the current one in the page). The second one, **type**, is a *string* that contains the type of request ('POST' or 'GET').
- ***processData*** is a function that handles the received data. It *must* return an array of objects with the following properties : **text** (the option's title), **value** (the option's value) and, optionally, **class** if you'd like to add a custom CSS class. All of these values are *strings*.

Here is an example of an AJAX config below.

```js
{
    request: {
        url: '/users/search',
        type: 'POST',
    },
    processData: function(data) {
        let results = [];

        data.forEach(it => {
            results.push({
                text: it.name,
                value: it.id
            });
        });

        return results;
    },
}
```

Additionally, you can add the following properties to your parameters :
- **minLength**: sets the minimum amount of characters that need to be typed for a search to be started. Default value : 4.
- **maxResults**: sets the maximum size of the data array that is sent to the *processData* function (if there is more, a special message will be displayed). Default value : 300. **It is recommended to leave this value untouched as it may heavily impact your website's performance**.

### Changing the default Parchemin messages

To change the default messages of Parchemin, you can use the following command: 

```js
const select = document.querySelector('#myselect');
parchemin.setLang(select, {
    empty: 'Empty select message',
    startSearch: 'Start typing message',
    minLengthAlert: 'Minimum length requirement message',
    searching: 'Searching message',
    noResults: 'No result found message',
    error: 'Error message',
    result: 'Single result found',
    results: 'Multiple results found',
    searchPlaceholder: 'Search placeholder message',
    moreResults: 'More precise search needed message'
})
```

This object has no required values. You can replace what you want, the others that are not included will be automatically handled by Parchemin.
