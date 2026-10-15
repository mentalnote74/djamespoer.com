import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-thingamajob-test',
  imports: [RouterOutlet],
  templateUrl: './test-host.html',
  styleUrl: './test-host.scss',
})
export class ThingamajobTestHost {
  skip(event: Event) {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }
}
