/**
 * Parchemin is a small JS snippet that handles dynamic select pickers with a searchbar and AJAX interactions for Boosted.
 * Please refer to the README.md file for all installation and usage instructions.
 * @author ntrx
 */

var VERSION = "1.0.0";

/* ---------- Miscellaneous handy functions ---------- */

/**
 * Looks for the provided "val" as a key inside the "obj" object. If it exists, returns that property. If not, returns the "def" (= default) parameter.
 * @param {object} obj the object to look inside
 * @param {string} val the property name to look for
 * @param {any} def the default value of the property
 * @returns {any} the props property value, or the def parameter if not found
 */
function getValueFromObject(obj, val, def) {
    if(val in obj) return obj[val];
    return def;
}

/* --------------------------------------------------- */

/**
 * The Parchemin class is a Singleton that keeps track of all the Scrolls, and allows global control of them.
 */
class Parchemin {
    /**
     * version = the plugin's version
     * scrolls = keeps that of all the Scrolls
     * lang = GUI notification messages configuration
     */
    constructor() {
        this.version = VERSION;
        this.scrolls = [];
        this.lang = {
            empty: 'Sélectionnez une valeur',
            startSearch: 'Commencez à taper pour lancer la recherche...',
            minLengthAlert: 'Veuillez taper au moins 4 caractères.',
            searching: 'Recherche...',
            noResults: 'Aucun résultat trouvé.',
            error: 'Une erreur est survenue.',
            result: 'résultat trouvé.',
            results: 'résultats trouvés.',
            searchPlaceholder: 'Rechercher un événement OL...',
            moreResults: 'en tout, affinez votre recherche'
        }
    }

    /**
     * Builds all of the <select> HTML tagged with a ".parchemin" class.
     */
    init() {
        const targets = document.querySelectorAll('.parchemin');
        
        targets.forEach(tar => {
            if(tar instanceof HTMLSelectElement) this.build(tar);
        });
    }

    /**
     * Builds a new Scroll from the provided node, and adds it to Parchemin's list of Scrolls.
     * @param {HTMLSelectElement} node 
     */
    build(node) {
        this.addScroll(new Scroll(node));
    }

    /**
     * Adds the provided Scroll to Parchemin's list of Scrolls.
     * @param {Scroll} scroll the Scroll to add
     */
    addScroll(scroll) {
        this.scrolls.push(scroll);
    }

    /**
     * Looks for a Scroll in Parchemin's list which node's ID matches the one provided.
     * @param {HTMLSelectElement} node the node to retrieve the ID from
     * @returns {Scroll|null} a matching Scroll, or null if none was found
     */
    getScrollFromNode(node) {
        return this.scrolls.find(x => x.node.id == node.id);
    }

    /**
     * Toggles a live search feature on the provided node (which is, supposedly, a Scroll)
     * @param {HTMLSelectElement} node the node to add a search feature on
     */
    addSearch(node) {
        const scroll = this.getScrollFromNode(node);
        if(scroll) scroll.addSearch();

        return this;
    }

    /**
     * Toggles a live AJAX search feature on the provided node (which is, supposedly, a Scroll)
     * @param {HTMLSelectElement} node the node to add a live AJAX search feature on
     * @param {object} params the AJAX parameters
     */
    addAjax(node, params) {
        const scroll = this.getScrollFromNode(node);
        if(scroll) scroll.addAjax(params);

        return this;
    }

    /**
     * Changes the node's default lang with the one provided.
     * @param {HTMLSelectElement} node the node to change the default lang on
     * @param {object} params the lang parameters
     * @returns 
     */
    setLang(node, params) {
        const scroll = this.getScrollFromNode(node);
        if(scroll) scroll.setLang(params);

        return this;
    }
}

/**
 * A Scroll is a single handler for a <select> element, dictated by Parchemin.
 * A Scroll can only be bound to one <select> element, and only one.
 */
class Scroll {
    /**
     * @param {HTMLSelectElement} node the <select> element bound to the Scroll
     * id = a unique ID to identify the Scroll
     * wrapper = the Scroll's wrapper HTML element
     * options = the Scroll's options (extracted from its node)
     * ajax = the Scroll's AJAX options
     * search = whether the Scroll has a live search feature
     * multiple = whether the Scroll accepts multiple choices
     */
    constructor(node) {
        this.id = Scroll.increaseCount();

        this.node = node;
        this.wrapper = null;
        this.options = null;
        this.multiple = false;
        this.search = false;
        this.ajax = false;
        this.lang = {...parchemin.lang};

        this.init();
    }

    /**
     * Ensures a uniquely generated ID for each Scroll.
     */
    static #count = 0;

    /**
     * Increases the current ID tracker and returns its value.
     * @returns {number} a new ID
     */
    static increaseCount() {
        return this.#count += 1;
    }

    /**
     * Initializes a new Scroll.
     */
    init() {
        this.setBaseOptions();

        // Wrapping the Select element into a div
        const wrapper = document.createElement('div');
        const doppel = document.createElement('div');
        const list = document.createElement('div');
        this.node.parentNode.insertBefore(wrapper, this.node);
        wrapper.appendChild(this.node);
        wrapper.appendChild(doppel);
        wrapper.appendChild(list);

        wrapper.classList.add('parcheminWrapper');
        wrapper.id = 'parchemin-' + this.id;

        doppel.classList.add('parcheminButton', 'form-select', 'dropdown-toggle');
        doppel.setAttribute('aria-expanded', 'false');
        doppel.setAttribute('data-bs-toggle', 'dropdown');
        doppel.textContent = this.lang.empty;

        list.classList.add('parcheminList', 'dropdown-menu');
        list.innerHTML = this.getOptionsAsHTML(this.node);

        this.wrapper = wrapper;
        this.multiple = this.node.multiple;
        this.addChoicesListeners();
    }

    /**
     * Displays the currently selected options on this Scroll's selector title.
     */
    drawSelectedOptions() {
        const options = Array.from(this.node.options).filter(x => x.selected);
        let str = '';

        if(options.length === 0) str = this.lang.empty;
        else {
            options.forEach(op => {
                str += op.textContent + ', ';
            });
            str = str.substring(0, str.length - 2);
        }

        this.wrapper.querySelector('.parcheminButton').textContent = str;
    }

    /**
     * Adds event listeners on the dropdown menu that are linked to the <select>'s options.
     */
    addChoicesListeners() {
        const list = this.wrapper.querySelector('.parcheminList');
        const selector = this.node;
        const highlight = this.wrapper.querySelector('.parcheminButton');
        list.childNodes.forEach(li => {
            if(li instanceof HTMLLIElement) li.addEventListener('click', e => {
                const value = li.firstChild.id.split('-')[2]; // Retrieve the value
                const choice = Array.from(selector.options).find(x => x.value == value); // Retrieve the matching choice from the hidden select

                if(this.multiple) {
                    e.stopImmediatePropagation(); // Cancel dropdown menu closure
                    choice.selected = !choice.selected;
                    li.querySelector('input[type="checkbox"]').checked = choice.selected;
                    this.drawSelectedOptions();
                } else {
                    selector.value = choice.value;
                    highlight.textContent = choice.textContent;
                }
            });
        });
    }

    /**
     * Returns this Scroll's <select>'s options.
     * @returns {HTMLOptionsCollection} the options
     */
    setBaseOptions() {
        return this.node.options;
    }

    /**
     * Returns this Scroll's options as an array.
     * @returns 
     */
    getOptionsAsArray() {
        return Array.from(this.node.options);
    }
    
    /**
     * Returns this Scroll's options as an HTML content string.
     * @returns {string} an HTML content string
     */
    getOptionsAsHTML() {
        const options = this.getOptionsAsArray();
        const multiple = this.node.multiple;

        let str = '';

        options.forEach(opt => {
            str += '<li class="parcheminOpt"><a id="parchemin-' + this.id + '-' + opt.value + '" class="dropdown-item" role="option"><input type="checkbox">' + opt.textContent + '</a></li>';
        })

        return str;
    }

    /**
     * Returns this Scroll's <li> elements from the dropdown menu.
     * @returns {NodeListOf<HTMLLIElement>} 
     */
    getList() {
        return this.wrapper.querySelector('.parcheminList').querySelectorAll('li');
    }

    /**
     * Adds a live search feature to this Scroll.
     */
    addSearch() {
        const searchBar = document.createElement('input');
        const searchBarStatus = document.createElement('p');
        const list = this.wrapper.querySelector('.parcheminList');
        searchBar.classList.add('form-control', 'parcheminSearch');
        searchBar.id = 'parchemin-search-' + this.id;
        searchBar.type = 'text';
        searchBar.setAttribute('autocomplete', 'off');
        searchBar.placeholder = this.lang.searchPlaceholder;
        searchBarStatus.classList.add('parcheminStatus')
        searchBarStatus.id = 'parchemin-status-' + this.id;
        searchBarStatus.textContent = this.lang.startSearch;
        searchBarStatus.style.display = 'none';

        list.prepend(searchBarStatus);
        list.prepend(searchBar);
        this.addSearchListeners();

        this.search = true;
    }

    /**
     * Returns this Scroll's search bar.
     * @returns {HTMLElement} the Scroll's search bar
     */
    getSearchBar() {
        return this.wrapper.querySelector('.parcheminSearch');
    }

    /**
     * Returns this Scroll's search bar status.
     * @returns {HTMLElement} the Scroll's search bar status
     */
    getSearchBarStatus() {
        return this.wrapper.querySelector('.parcheminStatus');
    }

    /**
     * Replaces this Scroll's search bar status text content with the provided string.
     * @param {string} msg the message to display
     */
    updateSearchBarStatus(msg) {
        this.getSearchBarStatus().textContent = msg;
    }

    /**
     * Adds all the event listeners that handle the live search feature.
     */
    addSearchListeners() {
        const node = this.getSearchBar();
        node.addEventListener('input', e => {

            const val = node.value.toLowerCase().trim();
            const list = this.getList();

            if(this.ajax) {
                if(val.length < 4) {
                    this.wipeOptions();
                    this.updateSearchBarStatus(this.lang.minLengthAlert);
                } else this.updateSearchBarStatus(this.lang.searching);
            } else {    
                list.forEach(li => {
                    const title = li.firstChild.textContent.toLowerCase().trim();
                    if(title.includes(val)) li.style.display = '';
                    else li.style.display = 'none';
                });
            }
        });
    }

    /**
     * Fetches data according to the provided AJAX parameters with the provided input data.
     * @param {object} params the AJAX params
     * @param {*} inputData the data to send
     */
    fetchData(params, inputData) {
        fetch(params.request.url, {
            method: params.request.type,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                search: inputData
            })
        })
        .then(response => response.text())
        .then(data => {
            const parsed = JSON.parse(data);
            const processed = params.processData(parsed.slice(0, 300));
            this.replaceChoices(processed, parsed.length);
        })
        .catch(error => {
            console.error('[PARCHEMIN][' + this.id + '] Error fetching data: ', error);
            this.updateSearchBarStatus(this.lang.error);
        });
    }

    /**
     * Wipes all of this Scroll's <select> options.
     */
    wipeOptions() {
        while(this.node.options.length > 0) this.node.remove(0);
        this.wrapper.querySelectorAll('li').forEach(no => no.remove());
    }

    /**
     * Adds the options to this Scroll according to the objects in the provided array.
     * @param {object} arr the array of options objects
     */
    addOptions(arr) {
        arr.forEach(opt => {
            const newOpt = document.createElement('option');
            newOpt.value = getValueFromObject(opt, 'value', -1);
            newOpt.textContent = getValueFromObject(opt, 'text', 'Error');
            newOpt.className = getValueFromObject(opt, 'class', '');
            this.node.appendChild(newOpt);

            const newLine = document.createElement('li');
            newLine.classList.add('parcheminOpt');
            newLine.innerHTML = '<a id="parchemin-' + this.id + '-' + newOpt.value + '" class="dropdown-item" role="option"><input type="checkbox">' + newOpt.textContent + '</a>';
            this.wrapper.querySelector('.parcheminList').appendChild(newLine);
        });

        this.addChoicesListeners();
    }

    /**
     * Checks the AJAX params object and adds missing properties, if any.
     * @param {object} params a Parchemin AJAX params object
     * @returns {object} the processed params
     */
    processAjaxParams(params) {
        const defaults = {
            minLength: 4,
            maxResults: 300,
        };

        return {...defaults, ...params};
    }

    /**
     * Checks the Lang params object and adds missing properties, if any.
     * @param {object} params a Parchemin Lang params object
     * @returns {object} the processed params
     */
    processLangParams(params) {
        const defaults = {
            empty: 'Sélectionnez une valeur',
            startSearch: 'Commencez à taper pour lancer la recherche...',
            minLengthAlert: 'Veuillez taper au moins 4 caractères.',
            searching: 'Recherche...',
            noResults: 'Aucun résultat trouvé.',
            error: 'Une erreur est survenue.',
            result: 'résultat trouvé.',
            results: 'résultats trouvés.',
            searchPlaceholder: 'Rechercher un événement OL...',
            moreResults: 'en tout, affinez votre recherche'
        }

        return {...defaults, ...params};
    }

    /**
     * Changes this Scroll's lang with the provided Lang params.
     * @param {object} params a Parchemin Lang params object
     */
    setLang(params) {
        this.lang = this.processLangParams(params);

        this.wrapper.querySelector('.parcheminButton').textContent = this.lang.empty;
        if(this.search) {
            this.wrapper.querySelector('.parcheminSearch').placeholder = this.lang.searchPlaceholder;
            this.wrapper.querySelector('.parcheminStatus').textContent = this.lang.startSearch;
        }
    }

    /**
     * Adds a live AJAX search feature with the provided parameters.
     * @param {object} params the AJAX parameters
     */
    addAjax(params) {
        this.ajax = this.processAjaxParams(params);

        const searchBar = this.getSearchBar();
        let debounce;
        searchBar.addEventListener('input', e => {
            clearTimeout(debounce);

            debounce = setTimeout(() => {
                const val = e.target.value.toLowerCase().trim();

                if(val.length >= this.ajax.minLength) this.fetchData(this.ajax, val);
            }, 1000);
        });
        this.getSearchBarStatus().style.display = 'block';
    }

    /**
     * Replaces this Scroll's choices with the ones provided.
     * @param {*} data 
     */
    replaceChoices(data, totalLength = 0) {
        this.wipeOptions();
        this.addOptions(data);

        if(data.length === 0) this.updateSearchBarStatus(this.lang.noResults);
        else if(data.length === 1) this.updateSearchBarStatus(data.length + " " + this.lang.result);
        else this.updateSearchBarStatus(data.length + " " + this.lang.results + (totalLength > this.ajax.maxResults ? " (" + totalLength + " " + this.lang.moreResults + ")" : ""));
    }
}

/**
 * Load Parchemin on page load
 */
var parchemin = new Parchemin();
parchemin.init();
