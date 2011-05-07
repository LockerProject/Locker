/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

exports.quickSort = function (array, compare) {
    quicksort(array, 0, array.length - 1, compare);
}

function quicksort(array, left, right, compare) {
    if(!compare) {
        compare = function(one, two) {
            if(one < two)
                return -1;
            if(one > two)
                return 1;
            return 0;
        }
    }
    if(right > left) { // subarray of 0 or 1 elements already sorted
        var pivotIndex = Math.floor(left + (right - left)/2);
        var pivotNewIndex = partition(array, left, right, pivotIndex, compare);
        // element at pivotNewIndex is now at its final position and never moved again
        //   and guarantees termination: recursive calls will sort smaller array
        // recursively sort elements on the left of pivotNewIndex
        quicksort(array, left, pivotNewIndex - 1, compare);
        // recursively sort elements on the right of pivotNewIndex
        quicksort(array, pivotNewIndex + 1, right, compare);
    }
}

function partition(array, left, right, pivotIndex, compare) {
    var pivotValue = array[pivotIndex];
    swap(array, pivotIndex, right); // Move pivot to end
    var storeIndex = left;
    for(var i = left; i < right; i++) {
        
        if(compare(array[i], pivotValue) <= 0) {
            swap(array, i, storeIndex);
            storeIndex++;
        }
    }
    swap(array, storeIndex, right); // Move pivot to its final place
    return storeIndex;
}

function swap(array, i, j) {
    var tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
}
